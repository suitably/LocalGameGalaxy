import { describe, expect, it } from 'vitest';
import { shouldRetryPassivePlay } from './passivePlayback';

const paused = { paused: true, ended: false };

describe('shouldRetryPassivePlay', () => {
  it('retries paused media while the host plays', () => {
    expect(shouldRetryPassivePlay(true, paused, 1000, 1000)).toBe(true);
  });

  it('does not touch media when the host is paused', () => {
    expect(shouldRetryPassivePlay(false, paused, 1000, 0)).toBe(false);
  });

  it('leaves playing media alone', () => {
    expect(shouldRetryPassivePlay(true, { paused: false, ended: false }, 1000, 0)).toBe(false);
  });

  it('does not restart a finished song', () => {
    expect(shouldRetryPassivePlay(true, { paused: true, ended: true }, 1000, 0)).toBe(false);
  });

  it('waits until the media element exists', () => {
    expect(shouldRetryPassivePlay(true, null, 1000, 0)).toBe(false);
  });

  it('waits for the retry interval', () => {
    expect(shouldRetryPassivePlay(true, paused, 999, 1000)).toBe(false);
  });
});
