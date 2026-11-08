/**
 * Tabletop Multi-Channel Synchronization Hook [ID: HOOK-TABLETOP-SYNC]
 *
 * The host (TV) owns the game state: other devices apply their actions locally for instant
 * feedback, send them as intents, and then take the host's deltas as the truth.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMultiChannelSync } from '../../../modules/sync/useMultiChannelSync';
import { MqttMailboxService } from '../../../modules/sync/MqttMailboxService';
import { generateUUID } from '../../../lib/uuid';
import { universalPartyManager } from '../../../features/party/logic/universalPartyManager';
import {
  acceptIntent,
  classifyDelta,
  isSyncedIntent,
  resolveSenderSeat,
  senderIsSpectator,
  type RosterEntry,
  type TabletopSyncEnvelope,
  type TabletopSyncAction,
} from '../logic/syncProtocol';
import { diffGame } from '../logic/stateDelta';
import { authorizeSeatIntent } from '../logic/intentAuthorization';
import { PrivateHandChannel } from '../logic/privateHandChannel';
import type { TabletopGameDefinition } from '../logic/types';
import type { TabletopAction } from '../logic/tabletopReducer';

interface UseTabletopSyncOptions {
  roomId: string | null;
  isHost: boolean;
  game: TabletopGameDefinition;
  dispatch: React.Dispatch<TabletopAction>;
  onReturnToLobby?: () => void;
  /** Seat of this device (phones); its private hand is sealed for it. */
  seat?: number | null;
  /** This device only watches: it sends no intents and the host would reject them anyway. */
  spectator?: boolean;
  /**
   * Non-host: the local game load has finished. The snapshot is requested only then, so the
   * local `LOAD_GAME` of the starter JSON can never overwrite the host's state (#667).
   */
  ready?: boolean;
  /** Non-host: called once the host's snapshot was applied (e.g. to clear a local load error). */
  onSnapshot?: () => void;
}

interface JoinedDevice {
  seat?: number;
  playerId?: string;
}

/** The host's party roster for this room, or null outside a party. */
const partyRoster = (roomId: string | null): RosterEntry[] | null => {
  const state = universalPartyManager.getRoomState();
  return state && state.roomId === roomId ? state.players : null;
};

export function useTabletopSync({
  roomId,
  isHost,
  game,
  dispatch,
  onReturnToLobby,
  seat = null,
  spectator = false,
  ready = true,
  onSnapshot,
}: UseTabletopSyncOptions) {
  const onSnapshotRef = useRef(onSnapshot);
  useEffect(() => {
    onSnapshotRef.current = onSnapshot;
  }, [onSnapshot]);
  const [senderId] = useState(() => `tt_${generateUUID().slice(0, 8)}`);
  const gameRef = useRef(game);
  /** Host: devices that announced themselves as spectators. */
  const spectatorsRef = useRef(new Set<string>());
  /** Host: seat and party id each device joined with (`REQUEST_SNAPSHOT`). */
  const joinedRef = useRef(new Map<string, JoinedDevice>());
  /** Host: last broadcast sequence number. Others: last applied one (`null` = no snapshot yet). */
  const seqRef = useRef<number | null>(isHost ? 0 : null);
  const lastSentGameRef = useRef(game);
  const [hands] = useState(() => new PrivateHandChannel());
  /** Sealing is async; one queue keeps sends and applies in sequence order. */
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const enqueue = useCallback((task: () => Promise<void>) => {
    queueRef.current = queueRef.current
      .then(task)
      .catch((err) => console.warn('[Tabletop] Sync step failed:', err));
  }, []);

  const mailbox = useMemo(
    () => new MqttMailboxService<TabletopSyncEnvelope>({ topicPrefix: 'lgg/tabletop' }),
    [],
  );
  const broadcastActionRef = useRef<(action: TabletopSyncAction) => void>(() => {});

  const handleIncomingMessage = useCallback(
    (envelope: TabletopSyncEnvelope) => {
      if (envelope.senderId === senderId) return; // Ignore own echo
      const action = envelope.action;
      const send = broadcastActionRef.current;

      /** Host: the sender as the host knows it; the seat it joined with wins over a claim. */
      const sender = (claim: { spectator?: boolean; playerId?: string; seat?: number }) => {
        const joined = joinedRef.current.get(envelope.senderId);
        return {
          spectator: senderIsSpectator({
            claimed: claim.spectator === true || spectatorsRef.current.has(envelope.senderId),
            playerId: claim.playerId ?? joined?.playerId,
            roster: partyRoster(roomId),
          }),
          seat: resolveSenderSeat(joined?.seat, claim.seat),
        };
      };

      switch (action.type) {
        case 'INTENT':
          if (isHost && acceptIntent(action.action, sender(action), gameRef.current)) {
            dispatch(action.action);
          }
          break;
        case 'STATE_DELTA':
          if (isHost) break;
          enqueue(async () => {
            const verdict = classifyDelta(seqRef.current, action.seq);
            if (verdict === 'resync') send({ type: 'REQUEST_SNAPSHOT' });
            if (verdict !== 'apply') return;
            const widgets = await hands.open(action.delta.widgets, action.sealed, seat);
            dispatch({ type: 'APPLY_REMOTE_DELTA', payload: { ...action.delta, widgets } });
            seqRef.current = action.seq;
          });
          break;
        case 'STATE_SNAPSHOT':
          if (isHost) break;
          enqueue(async () => {
            await hands.acceptHostKey(action.hostKey);
            const widgets = await hands.open(action.state.widgets, action.sealed, seat);
            dispatch({ type: 'LOAD_GAME', payload: { ...action.state, widgets } });
            seqRef.current = action.seq;
            onSnapshotRef.current?.();
          });
          break;
        case 'REQUEST_SNAPSHOT': {
          if (!isHost) break;
          if (action.spectator) spectatorsRef.current.add(envelope.senderId);
          else spectatorsRef.current.delete(envelope.senderId);
          // A resync request carries neither; keep what the device joined with.
          const prev = joinedRef.current.get(envelope.senderId);
          joinedRef.current.set(envelope.senderId, {
            seat: action.seat ?? prev?.seat,
            playerId: action.playerId ?? prev?.playerId,
          });
          enqueue(async () => {
            if (typeof action.seat === 'number' && action.publicKey) {
              await hands.registerSeat(action.seat, action.publicKey);
            }
            const out = await hands.outgoingSnapshot(gameRef.current);
            send({ type: 'STATE_SNAPSHOT', ...out, seq: seqRef.current ?? 0 });
          });
          break;
        }
        case 'FLICK_CARD_TO_TABLE': {
          const flick: TabletopAction = {
            type: 'ANIMATE_CARD_TO_TABLE',
            payload: { cardId: action.cardId, targetHolderId: action.targetHolderId },
          };
          // Others only animate; the host's delta is the truth (#685: own cards only).
          const s = isHost ? sender({ seat: action.senderSeat }) : null;
          if (!s || (!s.spectator && authorizeSeatIntent(flick, s, gameRef.current))) {
            dispatch(flick);
          }
          break;
        }
        case 'RETURN_TO_LOBBY':
          onReturnToLobby?.();
          break;
      }
    },
    [senderId, isHost, roomId, dispatch, onReturnToLobby, enqueue, hands, seat],
  );

  const { publish } = useMultiChannelSync<TabletopSyncEnvelope>({
    channelId: roomId,
    broadcastPrefix: 'galaxy_tabletop',
    mailbox,
    onMessage: handleIncomingMessage,
    enabled: Boolean(roomId),
  });

  const broadcastAction = useCallback(
    (action: TabletopSyncAction) => {
      if (!roomId) return;
      publish({ type: 'TABLETOP_SYNC', roomId, senderId, action, timestamp: Date.now() });
    },
    [publish, roomId, senderId],
  );

  useEffect(() => {
    broadcastActionRef.current = broadcastAction;
  }, [broadcastAction]);

  // Host: broadcast every state change (own actions and applied intents) as a delta.
  useEffect(() => {
    gameRef.current = game;
    if (!isHost || !roomId) return;
    const prev = lastSentGameRef.current;
    lastSentGameRef.current = game;
    const seq = (seqRef.current ?? 0) + 1;
    if (prev.id !== game.id) {
      seqRef.current = seq;
      enqueue(async () => {
        broadcastAction({ type: 'STATE_SNAPSHOT', ...(await hands.outgoingSnapshot(game)), seq });
      });
      return;
    }
    const delta = diffGame(prev, game);
    if (!delta) return;
    seqRef.current = seq;
    enqueue(async () => {
      broadcastAction({
        type: 'STATE_DELTA',
        ...(await hands.outgoingDelta(delta, game, prev)),
        seq,
      });
    });
  }, [game, isHost, roomId, broadcastAction, enqueue, hands]);

  // When joining as non-host, request snapshot from host (after the local load, see `ready`)
  useEffect(() => {
    if (!roomId || isHost || !ready) return;
    enqueue(async () => {
      const publicKey = seat !== null ? await hands.publicKey() : undefined;
      broadcastAction({
        type: 'REQUEST_SNAPSHOT',
        ...(seat !== null ? { seat } : {}),
        ...(publicKey ? { publicKey } : {}),
        ...(spectator ? { spectator: true } : {}),
        playerId: universalPartyManager.getMyPlayerId(),
      });
    });
  }, [roomId, isHost, ready, broadcastAction, enqueue, hands, seat, spectator]);

  /** Dispatch for UI components: applies locally and, on non-host devices, sends the intent. */
  const syncedDispatch = useCallback<React.Dispatch<TabletopAction>>(
    (action) => {
      if (spectator && isSyncedIntent(action)) return;
      dispatch(action);
      if (roomId && !isHost && isSyncedIntent(action)) {
        broadcastAction({
          type: 'INTENT',
          action,
          ...(spectator ? { spectator } : {}),
          ...(seat !== null ? { seat } : {}),
          playerId: universalPartyManager.getMyPlayerId(),
        });
      }
    },
    [dispatch, roomId, isHost, broadcastAction, spectator, seat],
  );

  return { broadcastAction, syncedDispatch, senderId };
}
