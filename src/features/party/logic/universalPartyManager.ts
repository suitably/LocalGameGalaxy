import { partyMailbox } from './partyMailbox';
import { ensureUniquePlayerName } from '../../../lib/disambiguateName';
import { storage, sessionStorageSafe, STORAGE_KEYS, STORAGE_PREFIXES } from '../../../lib/storage';

export interface PartyPlayer {
  id: string;
  name: string;
  avatarColor: string;
  isHost: boolean;
  score: number;
  joinedAt: number;
}

export type PartyGameType = 'guessart' | 'garticphone' | 'tabletop';

export interface PartyRoomState {
  type?: undefined;
  roomId: string;
  hostId: string;
  status: 'lobby' | 'in_game';
  activeGame: PartyGameType | null;
  gameId?: string | null;
  tabletopGameId?: string | null;
  players: PartyPlayer[];
  updatedAt: number;
}

export interface PartyPresenceMessage {
  type: 'PARTY_PRESENCE';
  roomId: string;
  player: PartyPlayer;
}

export type PartySyncEnvelope = PartyPresenceMessage | PartyRoomState;

const PLAYER_COLORS = [
  '#f44336',
  '#e91e63',
  '#9c27b0',
  '#3f51b5',
  '#2196f3',
  '#00bcd4',
  '#009688',
  '#4caf50',
  '#ff9800',
  '#795548',
];

class UniversalPartyManager {
  private currentRoomId: string | null = null;
  private currentRoomState: PartyRoomState | null = null;
  private updateListeners: ((state: PartyRoomState) => void)[] = [];
  private myPlayerId: string | null = null;
  private presenceInterval: ReturnType<typeof setInterval> | null = null;
  private localChannel: BroadcastChannel | null = null;

  public getRoomId(): string | null {
    return this.currentRoomState?.roomId || this.currentRoomId;
  }

  public getMyPlayerId(): string {
    if (!this.myPlayerId) {
      this.myPlayerId = sessionStorageSafe.get(STORAGE_KEYS.PARTY_MY_PLAYER_ID) || `p_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorageSafe.set(STORAGE_KEYS.PARTY_MY_PLAYER_ID, this.myPlayerId);
    }
    return this.myPlayerId;
  }

  public getRoomState(): PartyRoomState | null {
    return this.currentRoomState;
  }

  public isHost(roomId: string): boolean {
    const savedHostId = sessionStorageSafe.get(`${STORAGE_PREFIXES.PARTY_HOST_ID}${roomId}`);
    if (savedHostId) return true;
    if (this.currentRoomState && this.currentRoomState.roomId === roomId) {
      return this.currentRoomState.hostId === this.getMyPlayerId();
    }
    return false;
  }

  public getSavedHostRoomCode(): string {
    let saved = storage.get(STORAGE_KEYS.HOST_ROOM_CODE);
    if (!saved) {
      saved = Math.random().toString(36).substring(2, 8).toUpperCase();
      storage.set(STORAGE_KEYS.HOST_ROOM_CODE, saved);
    }
    return saved;
  }

  public setHostRoomCode(code: string): string {
    const cleaned = code.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');
    if (cleaned) {
      storage.set(STORAGE_KEYS.HOST_ROOM_CODE, cleaned);
      return cleaned;
    }
    return this.getSavedHostRoomCode();
  }

  public createParty(hostName: string, preferredRoomId?: string): { roomId: string; hostId: string; state: PartyRoomState } {
    const roomId = preferredRoomId ? this.setHostRoomCode(preferredRoomId) : this.getSavedHostRoomCode();
    const hostId = this.getMyPlayerId();

    sessionStorageSafe.set(`${STORAGE_PREFIXES.PARTY_HOST_ID}${roomId}`, hostId);

    let existingPlayers: PartyPlayer[] = [];
    if (this.currentRoomState && this.currentRoomState.roomId === roomId) {
      existingPlayers = this.currentRoomState.players;
    } else {
      const parsed = storage.getJson<PartyRoomState | null>(`${STORAGE_PREFIXES.PARTY_STATE}${roomId}`, null);
      if (parsed && Array.isArray(parsed.players)) {
        existingPlayers = parsed.players;
      }
    }

    const uniqueHostName = ensureUniquePlayerName(hostName || 'Host', existingPlayers, hostId);
    const hostPlayer: PartyPlayer = {
      id: hostId,
      name: uniqueHostName,
      avatarColor: PLAYER_COLORS[0],
      isHost: true,
      score: 0,
      joinedAt: Date.now(),
    };

    const hostIndex = existingPlayers.findIndex((p) => p.id === hostId);
    let newPlayers = [...existingPlayers];
    if (hostIndex >= 0) {
      newPlayers[hostIndex] = { ...newPlayers[hostIndex], name: uniqueHostName, isHost: true };
    } else {
      newPlayers = [hostPlayer, ...existingPlayers];
    }

    const state: PartyRoomState = {
      roomId,
      hostId,
      status: this.currentRoomState?.status || 'lobby',
      activeGame: this.currentRoomState?.activeGame || null,
      players: newPlayers,
      updatedAt: Date.now(),
    };

    this.currentRoomId = roomId;
    this.currentRoomState = state;
    this.publishPartyState(state);
    this.subscribeToParty(roomId);
    this.startPresenceHeartbeat(roomId, hostPlayer);

    return { roomId, hostId, state };
  }

  public joinParty(roomId: string, playerName: string): PartyRoomState {
    const pId = this.getMyPlayerId();
    const normalizedRoomId = roomId.toUpperCase().trim();
    const isRoomCreator = Boolean(sessionStorageSafe.get(`${STORAGE_PREFIXES.PARTY_HOST_ID}${normalizedRoomId}`));

    let state = this.currentRoomState;
    if (!state || state.roomId !== normalizedRoomId) {
      const saved = storage.getJson<PartyRoomState | null>(`${STORAGE_PREFIXES.PARTY_STATE}${normalizedRoomId}`, null);
      if (saved) {
        state = saved;
      }
    }

    const knownHostId = isRoomCreator
      ? pId
      : (state?.hostId || state?.players.find((p) => p.isHost)?.id || '');

    if (!state || state.roomId !== normalizedRoomId) {
      state = {
        roomId: normalizedRoomId,
        hostId: knownHostId,
        status: 'lobby',
        activeGame: null,
        players: [],
        updatedAt: Date.now(),
      };
    }

    const uniqueName = ensureUniquePlayerName(playerName || 'Spieler', state.players, pId);
    const existingIndex = state.players.findIndex((p) => p.id === pId);
    const playerEntry: PartyPlayer = {
      id: pId,
      name: uniqueName,
      avatarColor: PLAYER_COLORS[(existingIndex >= 0 ? existingIndex : state.players.length) % PLAYER_COLORS.length],
      isHost: isRoomCreator || (knownHostId === pId),
      score: existingIndex >= 0 ? state.players[existingIndex].score : 0,
      joinedAt: Date.now(),
    };

    const newPlayers = [...state.players];
    if (existingIndex >= 0) {
      newPlayers[existingIndex] = playerEntry;
    } else {
      newPlayers.push(playerEntry);
    }

    const updatedState: PartyRoomState = {
      ...state,
      players: newPlayers,
      hostId: knownHostId,
      updatedAt: Date.now(),
    };

    this.currentRoomId = normalizedRoomId;
    this.currentRoomState = updatedState;
    this.publishPartyState(updatedState);
    this.subscribeToParty(normalizedRoomId);
    this.startPresenceHeartbeat(normalizedRoomId, playerEntry);

    return updatedState;
  }

  public updatePlayerName(roomId: string, newName: string): PartyRoomState {
    return this.joinParty(roomId, newName);
  }

  public launchGame(roomId: string, gameType: PartyGameType, gameId?: string): PartyRoomState | null {
    if (!this.currentRoomState || this.currentRoomState.roomId !== roomId) {
      return null;
    }

    const updatedState: PartyRoomState = {
      ...this.currentRoomState,
      status: 'in_game',
      activeGame: gameType,
      gameId: gameId || null,
      tabletopGameId: gameType === 'tabletop' ? (gameId || null) : null,
      updatedAt: Date.now(),
    };

    this.currentRoomState = updatedState;
    this.publishPartyState(updatedState);
    return updatedState;
  }

  public returnToLobby(roomId: string): PartyRoomState | null {
    if (!this.currentRoomState || this.currentRoomState.roomId !== roomId) {
      return null;
    }

    const updatedState: PartyRoomState = {
      ...this.currentRoomState,
      status: 'lobby',
      activeGame: null,
      gameId: null,
      updatedAt: Date.now(),
    };

    this.currentRoomState = updatedState;
    this.publishPartyState(updatedState);
    return updatedState;
  }

  public subscribeToParty(roomId: string): void {
    const topic = `party_${roomId}`;

    // Setup local fast BroadcastChannel
    if (!this.localChannel || this.localChannel.name !== `party_bc_${roomId}`) {
      try {
        if (this.localChannel) {
          this.localChannel.close();
        }
        this.localChannel = new BroadcastChannel(`party_bc_${roomId}`);
        this.localChannel.onmessage = (event) => {
          if (event.data?.type === 'PARTY_STATE_SYNC' && event.data.state) {
            this.handleIncomingState(event.data.state, roomId);
          }
        };
      } catch {
        // ignore
      }
    }

    // MQTT subscription
    partyMailbox.subscribe(topic, async (incoming: PartySyncEnvelope) => {
      if (!incoming || incoming.roomId !== roomId) return;

      // Handle presence pings
      if (incoming.type === 'PARTY_PRESENCE' && incoming.player) {
        const p = incoming.player;
        if (this.currentRoomState && this.currentRoomState.roomId === roomId) {
          const exists = this.currentRoomState.players.some((pl) => pl.id === p.id);
          if (!exists) {
            const uniqueName = ensureUniquePlayerName(p.name, this.currentRoomState.players, p.id);
            const resolvedPlayer: PartyPlayer = { ...p, name: uniqueName };
            const updated = {
              ...this.currentRoomState,
              players: [...this.currentRoomState.players, resolvedPlayer],
              updatedAt: Date.now(),
            };
            this.currentRoomState = updated;
            this.notifyListeners();
            if (this.isHost(roomId)) {
              this.publishPartyState(updated);
            }
          } else if (this.isHost(roomId)) {
            // Immediate response from Host so remote client gets the full list right away
            this.publishPartyState(this.currentRoomState);
          }
        }
        return;
      }

      const incomingState = incoming as PartyRoomState;
      if (!incomingState.players || !Array.isArray(incomingState.players)) return;
      this.handleIncomingState(incomingState, roomId);
    });
  }

  private handleIncomingState(incomingState: PartyRoomState, roomId: string): void {
    const myId = this.getMyPlayerId();
    const isRoomCreator = Boolean(sessionStorageSafe.get(`${STORAGE_PREFIXES.PARTY_HOST_ID}${roomId}`));

    if (this.currentRoomState && this.currentRoomState.roomId === roomId) {
      const mergedPlayersMap = new Map<string, PartyPlayer>();
      
      // Preserve all locally known players
      this.currentRoomState.players.forEach((p) => mergedPlayersMap.set(p.id, p));
      // Merge incoming players
      incomingState.players.forEach((p) => {
        const existing = mergedPlayersMap.get(p.id);
        mergedPlayersMap.set(p.id, {
          ...p,
          score: existing ? Math.max(existing.score, p.score || 0) : p.score || 0,
        });
      });

      const resolvedHostId = isRoomCreator
        ? myId
        : (incomingState.hostId || this.currentRoomState.hostId || incomingState.players.find((p) => p.isHost)?.id || this.currentRoomState.players.find((p) => p.isHost)?.id || '');

      const mergedPlayers = Array.from(mergedPlayersMap.values()).map((p) => ({
        ...p,
        isHost: p.id === resolvedHostId || Boolean(p.isHost && !resolvedHostId),
      }));

      this.currentRoomState = {
        ...incomingState,
        hostId: resolvedHostId,
        players: mergedPlayers,
        updatedAt: Date.now(),
      };
    } else {
      const resolvedHostId = isRoomCreator
        ? myId
        : (incomingState.hostId || incomingState.players.find((p) => p.isHost)?.id || '');

      this.currentRoomState = {
        ...incomingState,
        hostId: resolvedHostId,
        players: incomingState.players.map((p) => ({
          ...p,
          isHost: p.id === resolvedHostId || Boolean(p.isHost && !resolvedHostId),
        })),
      };
    }

    storage.setJson(`${STORAGE_PREFIXES.PARTY_STATE}${roomId}`, this.currentRoomState);
    this.notifyListeners();
  }

  public publishPartyState(state: PartyRoomState): void {
    const topic = `party_${state.roomId}`;
    storage.setJson(`${STORAGE_PREFIXES.PARTY_STATE}${state.roomId}`, state);

    try {
      if (this.localChannel) {
        this.localChannel.postMessage({ type: 'PARTY_STATE_SYNC', state });
      }
    } catch {
      // ignore
    }

    partyMailbox.publish(topic, state);
    this.notifyListeners();
  }

  private startPresenceHeartbeat(roomId: string, player: PartyPlayer): void {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
    }

    const sendPing = () => {
      try {
        const topic = `party_${roomId}`;
        partyMailbox.publish(topic, { type: 'PARTY_PRESENCE', roomId, player });
      } catch {
        // ignore
      }
    };

    // Send immediately and recurring every 3 seconds for snappy updates
    sendPing();
    this.presenceInterval = setInterval(sendPing, 3000);
  }

  public onPartyUpdate(callback: (state: PartyRoomState) => void): () => void {
    this.updateListeners.push(callback);
    if (this.currentRoomState) {
      callback(this.currentRoomState);
    }
    return () => {
      this.updateListeners = this.updateListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(): void {
    if (this.currentRoomState) {
      this.updateListeners.forEach((cb) => cb(this.currentRoomState!));
    }
  }

  public leaveParty(roomId: string): void {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }
    if (this.localChannel) {
      this.localChannel.close();
      this.localChannel = null;
    }
    if (this.currentRoomState && this.currentRoomState.roomId === roomId) {
      const myId = this.getMyPlayerId();
      const updatedPlayers = this.currentRoomState.players.filter((p) => p.id !== myId);
      const updatedState = {
        ...this.currentRoomState,
        players: updatedPlayers,
        updatedAt: Date.now(),
      };
      this.currentRoomState = updatedState;
      this.publishPartyState(updatedState);
    }
  }
}

export const universalPartyManager = new UniversalPartyManager();
