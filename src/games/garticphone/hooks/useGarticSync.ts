/**
 * Gartic Phone Sync Hook [ID: GARTIC-HOOK-SYNC]
 *
 * Encapsulates multi-channel synchronization, player join pings, and remote
 * event handling using the shared useMultiChannelSync hook.
 */

import { useCallback, useEffect } from 'react';
import { useMultiChannelSync } from '../../../modules/sync';
import type { GarticGameState, GarticPlayer } from '../types';

export type GarticBroadcastMessage =
  | { type: 'STATE_SYNC'; state: GarticGameState }
  | { type: 'GARTIC_STEP_SUBMIT'; roomId: string; playerId: string; content: string }
  | { type: 'GARTIC_JOIN'; player: GarticPlayer }
  | { type: 'GARTIC_FORCE_END' };

interface UseGarticSyncOptions {
  roomId: string;
  isHost: boolean;
  myPlayerId: string;
  myPlayerName: string;
  getCurrentState: () => GarticGameState;
  onStateSync: (state: GarticGameState) => void;
  onStepSubmit: (playerId: string, content: string) => void;
  onPlayerJoin: (player: GarticPlayer) => GarticGameState | null;
  onForceEnd: () => void;
}

export function useGarticSync({
  roomId,
  isHost,
  myPlayerId,
  myPlayerName,
  getCurrentState,
  onStateSync,
  onStepSubmit,
  onPlayerJoin,
  onForceEnd,
}: UseGarticSyncOptions) {
  const { publish } = useMultiChannelSync<GarticBroadcastMessage>({
    channelId: roomId,
    broadcastPrefix: 'gartic_phone',
    onMessage: (msg) => {
      if (msg.type === 'STATE_SYNC' && msg.state) {
        onStateSync(msg.state);
      } else if (msg.type === 'GARTIC_STEP_SUBMIT' && msg.playerId && msg.content !== undefined) {
        onStepSubmit(msg.playerId, msg.content);
      } else if (msg.type === 'GARTIC_FORCE_END') {
        onForceEnd();
      } else if (msg.type === 'GARTIC_JOIN' && msg.player) {
        const updated = onPlayerJoin(msg.player);
        if (updated && isHost) {
          publish({ type: 'STATE_SYNC', state: updated });
        }
      }
    },
  });

  const broadcastState = useCallback(
    (newState: GarticGameState) => {
      publish({ type: 'STATE_SYNC', state: newState });
    },
    [publish]
  );

  const broadcastStepSubmit = useCallback(
    (playerId: string, content: string) => {
      publish({
        type: 'GARTIC_STEP_SUBMIT',
        roomId,
        playerId,
        content,
      });
    },
    [publish, roomId]
  );

  const broadcastForceEnd = useCallback(() => {
    publish({ type: 'GARTIC_FORCE_END' });
  }, [publish]);

  useEffect(() => {
    if (!roomId) return;

    // Send join ping & initial sync
    publish(
      {
        type: 'GARTIC_JOIN',
        player: {
          id: myPlayerId,
          name: myPlayerName,
          isHost,
          ready: true,
        },
      },
      roomId
    );

    if (isHost) {
      broadcastState(getCurrentState());
    }
  }, [roomId, myPlayerId, myPlayerName, isHost, publish, broadcastState, getCurrentState]);

  return {
    publish,
    broadcastState,
    broadcastStepSubmit,
    broadcastForceEnd,
  };
}
