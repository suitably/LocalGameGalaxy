import { describe, expect, it } from 'vitest';
import {
  discoveryRetryDelay,
  DISCOVERY_RETRY_FIRST_MS,
  DISCOVERY_RETRY_MAX_MS,
} from './discoveryRetry';

describe('discoveryRetryDelay', () => {
  it('starts at the first delay and grows by 1.5×', () => {
    expect(discoveryRetryDelay(0)).toBe(DISCOVERY_RETRY_FIRST_MS);
    expect(discoveryRetryDelay(1)).toBe(4500);
    expect(discoveryRetryDelay(2)).toBe(6750);
  });

  it('is capped', () => {
    expect(discoveryRetryDelay(20)).toBe(DISCOVERY_RETRY_MAX_MS);
  });

  it('treats negative attempts as the first', () => {
    expect(discoveryRetryDelay(-3)).toBe(DISCOVERY_RETRY_FIRST_MS);
  });
});
