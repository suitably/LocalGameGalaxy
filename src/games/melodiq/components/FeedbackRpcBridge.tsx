import { useEffect, useRef } from 'react';
import { useWebRTC } from '../audio/WebRTCContext';
import { submitFeedbackWithLocalPat } from '../../../lib/github';
import {
  canSubmitFeedback,
  parseFeedbackSubmit,
  type FeedbackResultReply,
} from '../logic/feedbackRpc';

/**
 * Host side of phone feedback: submits feedback received over the data channel with the host's
 * own GitHub PAT and answers success/error (`no_token` if the host has none).
 */
export const FeedbackRpcBridge: React.FC = () => {
  const { manager } = useWebRTC();
  const lastAtRef = useRef(new Map<string, number>());

  useEffect(() => {
    if (!manager) return;
    return manager.on('message', (peerId: string, data: unknown) => {
      const rpc = parseFeedbackSubmit(data);
      if (!rpc) return;

      const reply = (result: Omit<FeedbackResultReply, 'type' | 'reqId'>) => {
        const msg: FeedbackResultReply = {
          type: 'host.feedback.result',
          reqId: rpc.reqId,
          ...result,
        };
        manager.sendToPeer(peerId, msg);
      };

      const now = Date.now();
      if (!canSubmitFeedback(lastAtRef.current.get(peerId), now)) {
        reply({ success: false, error: 'Too many submissions, please wait a moment.' });
        return;
      }
      lastAtRef.current.set(peerId, now);

      void submitFeedbackWithLocalPat(rpc.title, rpc.body).then(reply, (e: unknown) =>
        reply({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }),
      );
    });
  }, [manager]);

  return null;
};
