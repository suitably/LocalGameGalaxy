import { useRef } from 'react';
import { useRoomEvents } from '../../../modules/room-game/useRoomEvents';
import { submitFeedbackWithLocalPat } from '../../../lib/feedbackSubmit';
import { handleFeedbackEvent, type FeedbackEvent } from '../logic/feedbackRpc';
import { MELODIQ_GAME_KEY, useMelodiqRoomTransport } from './useMelodiqRoomTransport';

/**
 * Host side of phone feedback: submits `feedback.submit` room events with the host's own GitHub
 * PAT and answers the sender with `feedback.result` (`no_token` if the host has none).
 */
export function useHostFeedback(): void {
  const room = useMelodiqRoomTransport();
  const lastAtRef = useRef(new Map<string, number>());
  useRoomEvents<FeedbackEvent>({
    gameKey: MELODIQ_GAME_KEY,
    roomId: room?.roomId ?? '',
    transport: room?.transport,
    enabled: !!room,
    onEvent: (event, send) => {
      void handleFeedbackEvent(event, {
        submit: submitFeedbackWithLocalPat,
        send,
        now: Date.now,
        lastAt: lastAtRef.current,
        selfId: room?.selfId ?? '',
      });
    },
  });
}
