import { useEffect } from 'react';
import { registerFeedbackRelay, type FeedbackResult } from '../../../lib/feedbackRelay';
import type { FeedbackResultReply, FeedbackSubmitRpc } from '../logic/feedbackRpc';

const RESULT_TIMEOUT_MS = 20_000;

/**
 * While the phone is connected to a host, registers a feedback relay so `submitFeedback`
 * sends the feedback over the data channel and waits for the host's success/error reply.
 */
export function useFeedbackRelay(isConnected: boolean, sendData: (data: object) => void): void {
  useEffect(() => {
    if (!isConnected) return;
    return registerFeedbackRelay(
      (title, body) =>
        new Promise<FeedbackResult>((resolve, reject) => {
          const reqId = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const eventName = `melodiq_feedback_result_${reqId}`;
          const onResult = (e: Event) => {
            window.removeEventListener(eventName, onResult);
            clearTimeout(timer);
            const { success, issueUrl, error, code } = (e as CustomEvent<FeedbackResultReply>)
              .detail;
            resolve({ success, issueUrl, error, code });
          };
          const timer = setTimeout(() => {
            window.removeEventListener(eventName, onResult);
            reject(new Error('Host did not answer in time.'));
          }, RESULT_TIMEOUT_MS);
          window.addEventListener(eventName, onResult);
          const rpc: FeedbackSubmitRpc = { type: 'host.feedback.submit', reqId, title, body };
          sendData(rpc);
        }),
    );
  }, [isConnected, sendData]);
}
