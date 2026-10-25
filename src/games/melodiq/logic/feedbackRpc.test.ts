import { describe, expect, it } from 'vitest';
import {
  canSubmitFeedback,
  FEEDBACK_BODY_MAX,
  FEEDBACK_MIN_INTERVAL_MS,
  parseFeedbackResult,
  parseFeedbackSubmit,
} from './feedbackRpc';

const submit = (over: Record<string, unknown>) => ({
  type: 'host.feedback.submit',
  reqId: 'r1',
  title: 't',
  body: 'b',
  ...over,
});

describe('parseFeedbackSubmit', () => {
  it('trims and caps title and body', () => {
    const rpc = parseFeedbackSubmit(
      submit({ title: '  Bug ', body: 'x'.repeat(FEEDBACK_BODY_MAX + 10) }),
    );
    expect(rpc?.title).toBe('Bug');
    expect(rpc?.body).toHaveLength(FEEDBACK_BODY_MAX);
  });

  it('rejects malformed or empty requests', () => {
    expect(parseFeedbackSubmit(null)).toBeNull();
    expect(parseFeedbackSubmit({ type: 'queue.get' })).toBeNull();
    expect(parseFeedbackSubmit(submit({ title: ' ' }))).toBeNull();
    expect(parseFeedbackSubmit(submit({ reqId: undefined }))).toBeNull();
  });
});

describe('parseFeedbackResult', () => {
  it('parses success and no_token replies', () => {
    expect(
      parseFeedbackResult({
        type: 'host.feedback.result',
        reqId: 'r',
        success: true,
        issueUrl: 'u',
      }),
    ).toMatchObject({ success: true, issueUrl: 'u' });
    expect(
      parseFeedbackResult({
        type: 'host.feedback.result',
        reqId: 'r',
        success: false,
        code: 'no_token',
      }),
    ).toMatchObject({ success: false, code: 'no_token' });
    expect(parseFeedbackResult({ type: 'other' })).toBeNull();
  });
});

describe('canSubmitFeedback', () => {
  it('rate limits per phone', () => {
    expect(canSubmitFeedback(undefined, 0)).toBe(true);
    expect(canSubmitFeedback(1000, 1000 + FEEDBACK_MIN_INTERVAL_MS - 1)).toBe(false);
    expect(canSubmitFeedback(1000, 1000 + FEEDBACK_MIN_INTERVAL_MS)).toBe(true);
  });
});
