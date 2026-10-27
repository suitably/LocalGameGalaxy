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
  senderIsSpectator,
  type RosterEntry,
  type TabletopSyncEnvelope,
  type TabletopSyncAction,
} from '../logic/syncProtocol';
import { diffGame } from '../logic/stateDelta';
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
}: UseTabletopSyncOptions) {
  const [senderId] = useState(() => `tt_${generateUUID().slice(0, 8)}`);
  const gameRef = useRef(game);
  /** Host: devices that announced themselves as spectators. */
  const spectatorsRef = useRef(new Set<string>());
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

      switch (action.type) {
        case 'INTENT':
          if (
            isHost &&
            acceptIntent(action.action, {
              spectator: senderIsSpectator({
                claimed: action.spectator === true || spectatorsRef.current.has(envelope.senderId),
                playerId: action.playerId,
                roster: partyRoster(roomId),
              }),
            })
          ) {
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
          });
          break;
        case 'REQUEST_SNAPSHOT':
          if (!isHost) break;
          if (action.spectator) spectatorsRef.current.add(envelope.senderId);
          else spectatorsRef.current.delete(envelope.senderId);
          enqueue(async () => {
            if (typeof action.seat === 'number' && action.publicKey) {
              await hands.registerSeat(action.seat, action.publicKey);
            }
            const out = await hands.outgoingSnapshot(gameRef.current);
            send({ type: 'STATE_SNAPSHOT', ...out, seq: seqRef.current ?? 0 });
          });
          break;
        case 'FLICK_CARD_TO_TABLE':
          dispatch({
            type: 'ANIMATE_CARD_TO_TABLE',
            payload: { cardId: action.cardId, targetHolderId: action.targetHolderId },
          });
          break;
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

  // When joining as non-host, request snapshot from host
  useEffect(() => {
    if (!roomId || isHost) return;
    enqueue(async () => {
      const publicKey = seat !== null ? await hands.publicKey() : undefined;
      broadcastAction({
        type: 'REQUEST_SNAPSHOT',
        ...(publicKey ? { seat: seat!, publicKey } : {}),
        ...(spectator ? { spectator: true } : {}),
        playerId: universalPartyManager.getMyPlayerId(),
      });
    });
  }, [roomId, isHost, broadcastAction, enqueue, hands, seat, spectator]);

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
          playerId: universalPartyManager.getMyPlayerId(),
        });
      }
    },
    [dispatch, roomId, isHost, broadcastAction, spectator],
  );

  return { broadcastAction, syncedDispatch, senderId };
}
