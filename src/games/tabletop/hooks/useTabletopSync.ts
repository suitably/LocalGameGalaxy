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
import {
  classifyDelta,
  isSyncedIntent,
  type TabletopSyncEnvelope,
  type TabletopSyncAction,
} from '../logic/syncProtocol';
import { diffGame } from '../logic/stateDelta';
import type { TabletopGameDefinition } from '../logic/types';
import type { TabletopAction } from '../logic/tabletopReducer';

interface UseTabletopSyncOptions {
  roomId: string | null;
  isHost: boolean;
  game: TabletopGameDefinition;
  dispatch: React.Dispatch<TabletopAction>;
  onReturnToLobby?: () => void;
}

export function useTabletopSync({
  roomId,
  isHost,
  game,
  dispatch,
  onReturnToLobby,
}: UseTabletopSyncOptions) {
  const [senderId] = useState(() => `tt_${generateUUID().slice(0, 8)}`);
  const gameRef = useRef(game);
  /** Host: last broadcast sequence number. Others: last applied one (`null` = no snapshot yet). */
  const seqRef = useRef<number | null>(isHost ? 0 : null);
  const lastSentGameRef = useRef(game);

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
          if (isHost && isSyncedIntent(action.action)) dispatch(action.action);
          break;
        case 'STATE_DELTA':
          if (isHost) break;
          switch (classifyDelta(seqRef.current, action.seq)) {
            case 'apply':
              dispatch({ type: 'APPLY_REMOTE_DELTA', payload: action.delta });
              seqRef.current = action.seq;
              break;
            case 'resync':
              send({ type: 'REQUEST_SNAPSHOT' });
              break;
          }
          break;
        case 'STATE_SNAPSHOT':
          if (isHost) break;
          dispatch({ type: 'LOAD_GAME', payload: action.state });
          seqRef.current = action.seq;
          break;
        case 'REQUEST_SNAPSHOT':
          if (isHost) {
            send({ type: 'STATE_SNAPSHOT', state: gameRef.current, seq: seqRef.current ?? 0 });
          }
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
    [senderId, isHost, dispatch, onReturnToLobby],
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
      broadcastAction({ type: 'STATE_SNAPSHOT', state: game, seq });
      return;
    }
    const delta = diffGame(prev, game);
    if (!delta) return;
    seqRef.current = seq;
    broadcastAction({ type: 'STATE_DELTA', delta, seq });
  }, [game, isHost, roomId, broadcastAction]);

  // When joining as non-host, request snapshot from host
  useEffect(() => {
    if (roomId && !isHost) broadcastAction({ type: 'REQUEST_SNAPSHOT' });
  }, [roomId, isHost, broadcastAction]);

  /** Dispatch for UI components: applies locally and, on non-host devices, sends the intent. */
  const syncedDispatch = useCallback<React.Dispatch<TabletopAction>>(
    (action) => {
      dispatch(action);
      if (roomId && !isHost && isSyncedIntent(action)) {
        broadcastAction({ type: 'INTENT', action });
      }
    },
    [dispatch, roomId, isHost, broadcastAction],
  );

  return { broadcastAction, syncedDispatch, senderId };
}
