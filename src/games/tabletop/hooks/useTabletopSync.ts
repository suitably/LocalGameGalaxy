/**
 * Tabletop Multi-Channel Synchronization Hook [ID: HOOK-TABLETOP-SYNC]
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMultiChannelSync } from '../../../modules/sync/useMultiChannelSync';
import { MqttMailboxService } from '../../../modules/sync/MqttMailboxService';
import { generateUUID } from '../../../lib/uuid';
import type { TabletopSyncEnvelope, TabletopSyncAction } from '../logic/syncProtocol';
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
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  const mailbox = useMemo(() => {
    return new MqttMailboxService<TabletopSyncEnvelope>({
      topicPrefix: 'lgg/tabletop',
    });
  }, []);

  const broadcastActionRef = useRef<(action: TabletopSyncAction) => void>(() => {});

  const handleIncomingMessage = useCallback(
    (envelope: TabletopSyncEnvelope) => {
      if (envelope.senderId === senderId) return; // Ignore own echo
      const action = envelope.action;

      switch (action.type) {
        case 'FLICK_CARD_TO_TABLE':
          dispatch({
            type: 'ANIMATE_CARD_TO_TABLE',
            payload: { cardId: action.cardId, targetHolderId: action.targetHolderId },
          });
          break;
        case 'DRAW_CARD':
          dispatch({
            type: 'DRAW_CARD',
            payload: { deckId: action.deckId, targetHolderId: action.targetHolderId },
          });
          break;
        case 'MOVE_WIDGET':
          dispatch({
            type: 'MOVE_WIDGET',
            payload: { id: action.id, x: action.x, y: action.y, zIndex: action.zIndex },
          });
          break;
        case 'ROLL_DICE':
          for (const dieId of action.dieIds) {
            dispatch({ type: 'ROLL_DIE', payload: { dieId } });
          }
          break;
        case 'UPDATE_COUNTER':
          dispatch({
            type: 'UPDATE_COUNTER',
            payload: { counterId: action.counterId, delta: action.delta },
          });
          break;
        case 'STATE_SNAPSHOT':
          dispatch({ type: 'LOAD_GAME', payload: action.state });
          break;
        case 'REQUEST_SNAPSHOT':
          if (isHost) {
            broadcastActionRef.current({ type: 'STATE_SNAPSHOT', state: gameRef.current });
          }
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
      publish({
        type: 'TABLETOP_SYNC',
        roomId,
        senderId,
        action,
        timestamp: Date.now(),
      });
    },
    [publish, roomId, senderId],
  );

  useEffect(() => {
    broadcastActionRef.current = broadcastAction;
  }, [broadcastAction]);

  // When joining as non-host, request snapshot from host
  useEffect(() => {
    if (roomId && !isHost) {
      broadcastAction({ type: 'REQUEST_SNAPSHOT' });
    }
  }, [roomId, isHost, broadcastAction]);

  return {
    broadcastAction,
    senderId,
  };
}
