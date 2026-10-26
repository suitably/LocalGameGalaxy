import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS, storage } from '../lib/storage';
import {
  readStoredSettings,
  resetStoredSettings,
  useStoredSettings,
  writeStoredSettings,
} from './useStoredSettings';

const KEY = STORAGE_KEYS.WORDLE_DICTIONARY_ONLY;
const defaults = { a: 1, b: 'x' };

describe('stored settings store', () => {
  beforeEach(() => storage.remove(KEY));

  it('returns defaults when nothing or non-object data is stored', () => {
    expect(readStoredSettings(KEY, defaults)).toBe(defaults);
    storage.set(KEY, 'true');
    expect(readStoredSettings(KEY, defaults)).toBe(defaults);
  });

  it('merges stored values over defaults and writes patches', () => {
    writeStoredSettings(KEY, defaults, { a: 2 });
    expect(readStoredSettings(KEY, defaults)).toEqual({ a: 2, b: 'x' });
    writeStoredSettings(KEY, defaults, { b: 'y' });
    expect(readStoredSettings(KEY, defaults)).toEqual({ a: 2, b: 'y' });
  });

  it('falls back to defaults when validation fails', () => {
    const isValid = (v: unknown): v is typeof defaults =>
      typeof (v as { a: unknown }).a === 'number';
    storage.setJson(KEY, { a: 'bad' });
    expect(readStoredSettings(KEY, defaults, isValid)).toBe(defaults);
  });

  it('reset removes the stored value', () => {
    writeStoredSettings(KEY, defaults, { a: 5 });
    resetStoredSettings(KEY);
    expect(readStoredSettings(KEY, defaults)).toBe(defaults);
  });
});

describe('useStoredSettings', () => {
  it('renders defaults on the server snapshot', () => {
    let seen: unknown;
    const C = () => {
      seen = useStoredSettings(KEY, defaults).value;
      return null;
    };
    renderToString(<C />);
    expect(seen).toEqual(defaults);
    vi.restoreAllMocks();
  });
});
