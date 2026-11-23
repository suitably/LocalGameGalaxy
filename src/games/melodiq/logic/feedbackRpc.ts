import type { FeedbackResult } from '../../../lib/feedbackRelay';

export const FEEDBACK_TITLE_MAX = 200;
export const FEEDBACK_BODY_MAX = 5000;
/** Minimum gap between two feedback submissions from the same phone. */
export const FEEDBACK_MIN_INTERVAL_MS = 10_000;
export const FEEDBACK_RATE_LIMIT_ERROR = 'Too many submissions, please wait a moment.';

/** Phone to host: submit feedback with the host's PAT. `from` is the phone's device id. */
export interface FeedbackSubmitEvent {
  type: 'feedback.submit';
  from: string;
  reqId: string;
  title: string;
  body: string;
}

/** Host to phone: outcome of a `FeedbackSubmitEvent`; `to` is the request's `from`. */
export interface FeedbackResultEvent extends FeedbackResult {
  type: 'feedback.result';
  /** Host device id. */
  from: string;
  to: string;
  reqId: string;
}

export type FeedbackEvent = FeedbackSubmitEvent | FeedbackResultEvent;

const nonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

/** Narrows a received room event to a feedback request (trimmed, length-capped), or null. */
export function parseFeedbackSubmit(data: unknown): FeedbackSubmitEvent | null {
  if (!data || typeof data !== 'object') return null;
  const msg = data as Record<string, unknown>;
  if (msg.type !== 'feedback.submit') return null;
  if (!nonEmptyString(msg.reqId) || !nonEmptyString(msg.from)) return null;
  if (typeof msg.title !== 'string' || typeof msg.body !== 'string') return null;
  const title = msg.title.trim().slice(0, FEEDBACK_TITLE_MAX);
  const body = msg.body.trim().slice(0, FEEDBACK_BODY_MAX);
  if (!title || !body) return null;
  return { type: 'feedback.submit', from: msg.from, reqId: msg.reqId, title, body };
}

/** Narrows a received room event to a feedback reply, or null. */
export function parseFeedbackResult(data: unknown): FeedbackResultEvent | null {
  if (!data || typeof data !== 'object') return null;
  const msg = data as Record<string, unknown>;
  if (msg.type !== 'feedback.result') return null;
  if (!nonEmptyString(msg.reqId) || !nonEmptyString(msg.to)) return null;
  return {
    type: 'feedback.result',
    from: typeof msg.from === 'string' ? msg.from : '',
    to: msg.to,
    reqId: msg.reqId,
    success: msg.success === true,
    issueUrl: typeof msg.issueUrl === 'string' ? msg.issueUrl : undefined,
    error: typeof msg.error === 'string' ? msg.error : undefined,
    code: msg.code === 'no_token' ? 'no_token' : undefined,
  };
}

/** True if a phone may submit now (rate limit per phone, keyed by its `from`). */
export const canSubmitFeedback = (lastAt: number | undefined, now: number): boolean =>
  lastAt === undefined || now - lastAt >= FEEDBACK_MIN_INTERVAL_MS;

export interface FeedbackHostDeps {
  /** Submits with the host's PAT (`submitFeedbackWithLocalPat`). */
  submit: (title: string, body: string) => Promise<FeedbackResult>;
  /** Publishes a reply on the room channel. */
  send: (event: FeedbackResultEvent) => void;
  now: () => number;
  /** Last accepted submission per `from`; owned by the caller so it survives re-renders. */
  lastAt: Map<string, number>;
  /** The host's own id, used as `from` of replies. */
  selfId: string;
}

/**
 * Host handler for one room event: ignores everything except a valid `feedback.submit`, applies
 * the per-sender rate limit, submits and answers the sender (`to`) with the same `reqId`.
 */
export function handleFeedbackEvent(event: unknown, deps: FeedbackHostDeps): Promise<void> {
  const rpc = parseFeedbackSubmit(event);
  if (!rpc) return Promise.resolve();
  const reply = (result: FeedbackResult) =>
    deps.send({
      type: 'feedback.result',
      from: deps.selfId,
      to: rpc.from,
      reqId: rpc.reqId,
      ...result,
    });

  const now = deps.now();
  if (!canSubmitFeedback(deps.lastAt.get(rpc.from), now)) {
    reply({ success: false, error: FEEDBACK_RATE_LIMIT_ERROR });
    return Promise.resolve();
  }
  deps.lastAt.set(rpc.from, now);
  return deps
    .submit(rpc.title, rpc.body)
    .then(reply, (e: unknown) =>
      reply({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }),
    );
}
