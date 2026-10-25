import { describe, it, expect } from 'vitest';
import { zOrderOpForKey } from '../useZOrderShortcuts';

const key = (k: string, mods: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } = {}) =>
  zOrderOpForKey({ key: k, ctrlKey: false, metaKey: false, shiftKey: false, ...mods });

describe('zOrderOpForKey', () => {
  it('maps Ctrl/Cmd + brackets, Shift for the extremes', () => {
    expect(key(']', { ctrlKey: true })).toBe('forward');
    expect(key('[', { metaKey: true })).toBe('backward');
    expect(key('}', { ctrlKey: true, shiftKey: true })).toBe('front');
    expect(key('{', { ctrlKey: true, shiftKey: true })).toBe('back');
  });

  it('ignores brackets without a modifier and other keys', () => {
    expect(key(']')).toBeNull();
    expect(key('a', { ctrlKey: true })).toBeNull();
  });
});
