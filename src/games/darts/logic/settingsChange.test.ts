import { describe, expect, it } from 'vitest';
import { setupChangeResetsProgress } from './settingsChange';

const base = { mode: '501' as const, playerIds: ['a', 'b'] };

describe('setupChangeResetsProgress', () => {
  it('is false without progress', () => {
    expect(setupChangeResetsProgress(base, { ...base, mode: '301' }, false)).toBe(false);
  });
  it('is false when nothing relevant changed', () => {
    expect(setupChangeResetsProgress(base, { ...base }, true)).toBe(false);
  });
  it('is true on mode change with progress', () => {
    expect(setupChangeResetsProgress(base, { ...base, mode: 'count_up' }, true)).toBe(true);
  });
  it('is true when the roster changes with progress', () => {
    expect(setupChangeResetsProgress(base, { ...base, playerIds: ['a'] }, true)).toBe(true);
    expect(setupChangeResetsProgress(base, { ...base, playerIds: ['a', 'c'] }, true)).toBe(true);
  });
});
