import type { FeedbackResult } from '../../../lib/feedbackRelay';

export const FEEDBACK_TITLE_MAX = 200;
export const FEEDBACK_BODY_MAX = 5000;
/** Minimum gap between two feedback submissions from the same phone. */
export const FEEDBACK_MIN_INTERVAL_MS = 10_000;

/** Phone to host: submit feedback with the host's PAT. */
export interface FeedbackSubmitRpc {
  type: 'host.feedback.submit';
  reqId: string;
  title: string;
  body: string;
}

/** Host to phone: outcome of a `FeedbackSubmitRpc`. */
export interface FeedbackResultReply extends FeedbackResult {
  type: 'host.feedback.result';
  reqId: string;
}

/** Narrows a received data-channel message to a feedback request (trimmed, length-capped), or null. */
export function parseFeedbackSubmit(data: unknown): FeedbackSubmitRpc | null {
  if (!data || typeof data !== 'object') return null;
  const msg = data as Record<string, unknown>;
  if (msg.type !== 'host.feedback.submit') return null;
  if (typeof msg.reqId !== 'string' || !msg.reqId) return null;
  if (typeof msg.title !== 'string' || typeof msg.body !== 'string') return null;
  const title = msg.title.trim().slice(0, FEEDBACK_TITLE_MAX);
  const body = msg.body.trim().slice(0, FEEDBACK_BODY_MAX);
  if (!title || !body) return null;
  return { type: 'host.feedback.submit', reqId: msg.reqId, title, body };
}

/** Narrows a received data-channel message to a feedback reply, or null. */
export function parseFeedbackResult(data: unknown): FeedbackResultReply | null {
  if (!data || typeof data !== 'object') return null;
  const msg = data as Record<string, unknown>;
  if (msg.type !== 'host.feedback.result' || typeof msg.reqId !== 'string') return null;
  return {
    type: 'host.feedback.result',
    reqId: msg.reqId,
    success: msg.success === true,
    issueUrl: typeof msg.issueUrl === 'string' ? msg.issueUrl : undefined,
    error: typeof msg.error === 'string' ? msg.error : undefined,
    code: msg.code === 'no_token' ? 'no_token' : undefined,
  };
}

/** True if a phone may submit now (rate limit per phone). */
export const canSubmitFeedback = (lastAt: number | undefined, now: number): boolean =>
  lastAt === undefined || now - lastAt >= FEEDBACK_MIN_INTERVAL_MS;
