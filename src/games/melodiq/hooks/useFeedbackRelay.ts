import { useEffect, useRef } from 'react';
import { registerFeedbackRelay, type FeedbackResult } from '../../../lib/feedbackRelay';
import { useRoomEvents } from '../../../modules/room-game/useRoomEvents';
import {
  parseFeedbackResult,
  type FeedbackEvent,
  type FeedbackSubmitEvent,
} from '../logic/feedbackRpc';
import { MELODIQ_GAME_KEY, type MelodiqRoomTransport } from './useMelodiqRoomTransport';

const RESULT_TIMEOUT_MS = 20_000;

type Pending = { selfId: string; resolve: (result: FeedbackResult) => void };

/**
 * While the phone is connected to a host (`room` set), registers a feedback relay so
 * `submitFeedback` sends `feedback.submit` and resolves on the host's `feedback.result` with the
 * same `reqId` addressed to this phone.
 */
export function useFeedbackRelay(room: MelodiqRoomTransport | null): void {
  const pendingRef = useRef(new Map<string, Pending>());
  const { send } = useRoomEvents<FeedbackEvent>({
    gameKey: MELODIQ_GAME_KEY,
    roomId: room?.roomId ?? '',
    transport: room?.transport,
    enabled: !!room,
    onEvent: (event) => {
      const result = parseFeedbackResult(event);
      const pending = result && pendingRef.current.get(result.reqId);
      if (!result || !pending || result.to !== pending.selfId) return;
      pendingRef.current.delete(result.reqId);
      const { success, issueUrl, error, code } = result;
      pending.resolve({ success, issueUrl, error, code });
    },
  });

  const selfId = room?.selfId;
  useEffect(() => {
    if (!selfId) return;
    const pendingMap = pendingRef.current;
    const unregister = registerFeedbackRelay(
      (title, body) =>
        new Promise<FeedbackResult>((resolve, reject) => {
          const reqId = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const timer = setTimeout(() => {
            pendingMap.delete(reqId);
            reject(new Error('Host did not answer in time.'));
          }, RESULT_TIMEOUT_MS);
          pendingMap.set(reqId, {
            selfId,
            resolve: (result) => {
              clearTimeout(timer);
              resolve(result);
            },
          });
          const rpc: FeedbackSubmitEvent = {
            type: 'feedback.submit',
            from: selfId,
            reqId,
            title,
            body,
          };
          send(rpc);
        }),
    );
    return () => {
      unregister();
      pendingMap.clear();
    };
  }, [selfId, send]);
}
