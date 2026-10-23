import { partyMailbox } from './partyMailbox';
import { storage, sessionStorageSafe, STORAGE_KEYS, STORAGE_PREFIXES } from '../../../lib/storage';
import { MultiChannelSyncCoordinator } from '../../../modules/sync';
import {
  addPresencePlayer,
  assignSlots,
  mergeIncomingState,
  removePlayer,
  resolveHostId,
  upsertHost,
  upsertJoiningPlayer,
} from './partyRoster';

export interface PartyPlayer {
  id: string;
  name: string;
  avatarColor: string;
  isHost: boolean;
  score: number;
  joinedAt: number;
  /** Last join or rename of this entry; the newer copy wins when rosters merge. */
  updatedAt?: number;
  /** Stable seat number assigned by the host (`assignSlots`); tabletop seat of this player. */
  slot?: number;
}

/** Dice games played in the room, everyone on their own sheet (`modules/room-game`). */
export type RoomDiceGame = 'knister';
export type PartyGameType = 'guessart' | 'garticphone' | 'tabletop' | RoomDiceGame;

export interface PartyRoomState {
  type?: undefined;
  roomId: string;
  hostId: string;
  status: 'lobby' | 'in_game';
  activeGame: PartyGameType | null;
  gameId?: string | null;
  tabletopGameId?: string | null;
  players: PartyPlayer[];
  /** Player id → when they left or were removed; keeps stale rosters from adding them back. */
  left?: Record<string, number>;
  updatedAt: number;
}

export interface PartyPresenceMessage {
  type: 'PARTY_PRESENCE';
  roomId: string;
  player: PartyPlayer;
}

export type PartySyncEnvelope = PartyPresenceMessage | PartyRoomState;

class UniversalPartyManager {
  private currentRoomId: string | null = null;
  private currentRoomState: PartyRoomState | null = null;
  private updateListeners: ((state: PartyRoomState) => void)[] = [];
  private myPlayerId: string | null = null;
  private presenceInterval: ReturnType<typeof setInterval> | null = null;
  /** BroadcastChannel (other tabs) + MQTT (other devices) for the current room. */
  private sync: MultiChannelSyncCoordinator<PartySyncEnvelope> | null = null;
  private syncChannelId: string | null = null;

  public getRoomId(): string | null {
    return this.currentRoomState?.roomId || this.currentRoomId;
  }

  public getMyPlayerId(): string {
    if (!this.myPlayerId) {
      this.myPlayerId =
        sessionStorageSafe.get(STORAGE_KEYS.PARTY_MY_PLAYER_ID) ||
        `p_${Math.random().toString(36).substring(2, 9)}`;
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
    const cleaned = code
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9_-]/g, '');
    if (cleaned) {
      storage.set(STORAGE_KEYS.HOST_ROOM_CODE, cleaned);
      return cleaned;
    }
    return this.getSavedHostRoomCode();
  }

  public createParty(
    hostName: string,
    preferredRoomId?: string,
  ): { roomId: string; hostId: string; state: PartyRoomState } {
    const roomId = preferredRoomId
      ? this.setHostRoomCode(preferredRoomId)
      : this.getSavedHostRoomCode();
    const hostId = this.getMyPlayerId();

    sessionStorageSafe.set(`${STORAGE_PREFIXES.PARTY_HOST_ID}${roomId}`, hostId);

    let existingPlayers: PartyPlayer[] = [];
    if (this.currentRoomState && this.currentRoomState.roomId === roomId) {
      existingPlayers = this.currentRoomState.players;
    } else {
      const parsed = storage.getJson<PartyRoomState | null>(
        `${STORAGE_PREFIXES.PARTY_STATE}${roomId}`,
        null,
      );
      if (parsed && Array.isArray(parsed.players)) {
        existingPlayers = parsed.players;
      }
    }

    const { players: newPlayers, host: hostPlayer } = upsertHost(existingPlayers, {
      hostId,
      name: hostName,
      now: Date.now(),
    });

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
    const isRoomCreator = Boolean(
      sessionStorageSafe.get(`${STORAGE_PREFIXES.PARTY_HOST_ID}${normalizedRoomId}`),
    );

    let state = this.currentRoomState;
    if (!state || state.roomId !== normalizedRoomId) {
      const saved = storage.getJson<PartyRoomState | null>(
        `${STORAGE_PREFIXES.PARTY_STATE}${normalizedRoomId}`,
        null,
      );
      if (saved) {
        state = saved;
      }
    }

    const knownHostId = state
      ? resolveHostId({ isRoomCreator, myId: pId, incoming: state })
      : isRoomCreator
        ? pId
        : '';

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

    const { players: newPlayers, player: playerEntry } = upsertJoiningPlayer(state.players, {
      playerId: pId,
      name: playerName,
      isHost: isRoomCreator || knownHostId === pId,
      now: Date.now(),
    });

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

  public launchGame(
    roomId: string,
    gameType: PartyGameType,
    gameId?: string,
  ): PartyRoomState | null {
    if (!this.currentRoomState || this.currentRoomState.roomId !== roomId) {
      return null;
    }

    const updatedState: PartyRoomState = {
      ...this.currentRoomState,
      status: 'in_game',
      activeGame: gameType,
      gameId: gameId || null,
      tabletopGameId: gameType === 'tabletop' ? gameId || null : null,
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

  /** MQTT channel of a room (topic `lgg/party/party_<room>`, kept for older clients). */
  private channelOf(roomId: string): string {
    return `party_${roomId}`;
  }

  public subscribeToParty(roomId: string): void {
    const channelId = this.channelOf(roomId);
    if (this.sync && this.syncChannelId === channelId) return;
    this.sync?.stop();
    this.syncChannelId = channelId;
    this.sync = new MultiChannelSyncCoordinator<PartySyncEnvelope>({
      channelId,
      broadcastPrefix: 'galaxy',
      mailbox: partyMailbox,
      onMessage: (incoming) => this.handleEnvelope(incoming, roomId),
    });
    this.sync.start();
  }

  private handleEnvelope(incoming: PartySyncEnvelope, roomId: string): void {
    if (!incoming || incoming.roomId !== roomId) return;

    if (incoming.type === 'PARTY_PRESENCE') {
      // Own pings come back over BroadcastChannel; only other players' pings matter.
      if (!incoming.player || incoming.player.id === this.getMyPlayerId()) return;
      if (this.currentRoomState && this.currentRoomState.roomId === roomId) {
        const updated = addPresencePlayer(this.currentRoomState, incoming.player, Date.now());
        if (updated) {
          this.currentRoomState = updated;
          this.notifyListeners();
          if (this.isHost(roomId)) this.publishPartyState(updated);
        } else if (this.isHost(roomId)) {
          // Immediate answer from the host so a joining device gets the full list right away
          this.publishPartyState(this.currentRoomState);
        }
      }
      return;
    }

    if (!Array.isArray(incoming.players)) return;
    this.handleIncomingState(incoming, roomId);
  }

  private handleIncomingState(incomingState: PartyRoomState, roomId: string): void {
    const myId = this.getMyPlayerId();
    const isRoomCreator = Boolean(
      sessionStorageSafe.get(`${STORAGE_PREFIXES.PARTY_HOST_ID}${roomId}`),
    );

    const current = this.currentRoomState?.roomId === roomId ? this.currentRoomState : null;
    this.currentRoomState = mergeIncomingState(current, incomingState, {
      myId,
      isRoomCreator,
      now: Date.now(),
    });

    storage.setJson(`${STORAGE_PREFIXES.PARTY_STATE}${roomId}`, this.currentRoomState);
    this.notifyListeners();
  }

  public publishPartyState(state: PartyRoomState): void {
    // The host owns seat numbers: every state it sends carries a slot for each player.
    const published = this.isHost(state.roomId)
      ? { ...state, players: assignSlots(state.players) }
      : state;
    if (this.currentRoomState?.roomId === published.roomId) this.currentRoomState = published;
    storage.setJson(`${STORAGE_PREFIXES.PARTY_STATE}${published.roomId}`, published);
    this.subscribeToParty(published.roomId);
    this.sync?.publish(published);
    this.notifyListeners();
  }

  private startPresenceHeartbeat(roomId: string, player: PartyPlayer): void {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
    }

    const sendPing = () => {
      this.subscribeToParty(roomId);
      this.sync?.publish({ type: 'PARTY_PRESENCE', roomId, player });
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

  /** The host takes a player out of the room (e.g. a phone that went away). */
  public removeFromParty(roomId: string, playerId: string): PartyRoomState | null {
    if (this.currentRoomState?.roomId !== roomId || playerId === this.getMyPlayerId()) return null;
    const updated = removePlayer(this.currentRoomState, playerId, Date.now());
    this.publishPartyState(updated);
    return updated;
  }

  /** This device leaves: the others drop it from their roster, and the room is forgotten here. */
  public leaveParty(roomId: string): void {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }
    const current = this.currentRoomState?.roomId === roomId ? this.currentRoomState : null;
    // Forget the room first: the farewell publish then notifies no listener (which could leave again).
    this.currentRoomState = null;
    this.currentRoomId = null;
    if (current) this.publishPartyState(removePlayer(current, this.getMyPlayerId(), Date.now()));
    this.sync?.stop();
    this.sync = null;
    this.syncChannelId = null;
    storage.remove(`${STORAGE_PREFIXES.PARTY_STATE}${roomId}`);
    sessionStorageSafe.remove(`${STORAGE_PREFIXES.PARTY_HOST_ID}${roomId}`);
  }
}

export const universalPartyManager = new UniversalPartyManager();
