import { describe, expect, it, vi } from 'vitest';
import { createMemoryTransport } from '../../../modules/room-game/roomTransport';
import {
  canSubmitFeedback,
  FEEDBACK_BODY_MAX,
  FEEDBACK_MIN_INTERVAL_MS,
  FEEDBACK_RATE_LIMIT_ERROR,
  handleFeedbackEvent,
  parseFeedbackResult,
  parseFeedbackSubmit,
  type FeedbackResultEvent,
} from './feedbackRpc';

const submit = (over: Record<string, unknown> = {}) => ({
  type: 'feedback.submit',
  from: 'dev_a',
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
    expect(parseFeedbackSubmit(submit({ type: 'host.feedback.submit' }))).toBeNull();
    expect(parseFeedbackSubmit(submit({ title: ' ' }))).toBeNull();
    expect(parseFeedbackSubmit(submit({ reqId: undefined }))).toBeNull();
    expect(parseFeedbackSubmit(submit({ from: '' }))).toBeNull();
    expect(parseFeedbackSubmit(submit({ body: 5 }))).toBeNull();
  });
});

describe('parseFeedbackResult', () => {
  const result = (over: Record<string, unknown>) => ({
    type: 'feedback.result',
    from: 'host',
    to: 'dev_a',
    reqId: 'r',
    ...over,
  });

  it('parses success and no_token replies', () => {
    expect(parseFeedbackResult(result({ success: true, issueUrl: 'u' }))).toMatchObject({
      success: true,
      issueUrl: 'u',
      to: 'dev_a',
    });
    expect(parseFeedbackResult(result({ success: false, code: 'no_token' }))).toMatchObject({
      success: false,
      code: 'no_token',
    });
  });

  it('rejects malformed replies', () => {
    expect(parseFeedbackResult({ type: 'other' })).toBeNull();
    expect(parseFeedbackResult(result({ reqId: undefined }))).toBeNull();
    expect(parseFeedbackResult(result({ to: undefined }))).toBeNull();
    expect(parseFeedbackResult(result({ type: 'host.feedback.result' }))).toBeNull();
  });
});

describe('canSubmitFeedback', () => {
  it('rate limits per phone', () => {
    expect(canSubmitFeedback(undefined, 0)).toBe(true);
    expect(canSubmitFeedback(1000, 1000 + FEEDBACK_MIN_INTERVAL_MS - 1)).toBe(false);
    expect(canSubmitFeedback(1000, 1000 + FEEDBACK_MIN_INTERVAL_MS)).toBe(true);
  });
});

describe('handleFeedbackEvent', () => {
  const setup = (submitFn = vi.fn().mockResolvedValue({ success: true, issueUrl: 'u' })) => {
    const transport = createMemoryTransport();
    const replies: FeedbackResultEvent[] = [];
    transport.subscribe('c', (m) => {
      if (parseFeedbackResult(m)) replies.push(m as FeedbackResultEvent);
    });
    let clock = 0;
    const deps = {
      submit: submitFn,
      send: (e: FeedbackResultEvent) => transport.publish('c', e),
      now: () => clock,
      lastAt: new Map<string, number>(),
      selfId: 'host',
    };
    return { deps, replies, submitFn, advance: (ms: number) => (clock += ms) };
  };

  it('replies to the sender with its reqId', async () => {
    const { deps, replies, submitFn } = setup();
    await handleFeedbackEvent(submit(), deps);
    expect(submitFn).toHaveBeenCalledWith('t', 'b');
    expect(replies).toEqual([
      {
        type: 'feedback.result',
        from: 'host',
        to: 'dev_a',
        reqId: 'r1',
        success: true,
        issueUrl: 'u',
      },
    ]);
  });

  it('passes no_token through and turns a rejection into an error reply', async () => {
    const a = setup(vi.fn().mockResolvedValue({ success: false, code: 'no_token' }));
    await handleFeedbackEvent(submit(), a.deps);
    expect(a.replies[0]).toMatchObject({ code: 'no_token', to: 'dev_a' });
    const b = setup(vi.fn().mockRejectedValue(new Error('boom')));
    await handleFeedbackEvent(submit(), b.deps);
    expect(b.replies[0]).toMatchObject({ success: false, error: 'boom' });
  });

  it('rate limits per sender', async () => {
    const { deps, replies, submitFn, advance } = setup();
    await handleFeedbackEvent(submit(), deps);
    await handleFeedbackEvent(submit({ reqId: 'r2' }), deps);
    expect(replies[1]).toMatchObject({ reqId: 'r2', error: FEEDBACK_RATE_LIMIT_ERROR });
    await handleFeedbackEvent(submit({ from: 'dev_b', reqId: 'r3' }), deps);
    expect(replies[2]).toMatchObject({ to: 'dev_b', success: true });
    advance(FEEDBACK_MIN_INTERVAL_MS);
    await handleFeedbackEvent(submit({ reqId: 'r4' }), deps);
    expect(replies[3]).toMatchObject({ reqId: 'r4', success: true });
    expect(submitFn).toHaveBeenCalledTimes(3);
  });

  it('ignores malformed events and the host own replies', async () => {
    const { deps, replies, submitFn } = setup();
    await handleFeedbackEvent(submit({ title: '' }), deps);
    await handleFeedbackEvent({ type: 'feedback.result', to: 'x', reqId: 'r' }, deps);
    expect(submitFn).not.toHaveBeenCalled();
    expect(replies).toHaveLength(0);
  });
});
