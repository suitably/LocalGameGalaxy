import { describe, it, expect } from 'vitest';
import { checkSaveName, suggestUniqueName } from '../saveNames';

describe('suggestUniqueName (#538)', () => {
  it('keeps a free name and counts up a taken one', () => {
    expect(suggestUniqueName(' Round 1 ', [])).toBe('Round 1');
    expect(suggestUniqueName('Round 1', ['round 1'])).toBe('Round 1 (2)');
    expect(suggestUniqueName('Round 1', ['Round 1', 'Round 1 (2)'])).toBe('Round 1 (3)');
  });

  it('replaces an existing counter instead of stacking one', () => {
    expect(suggestUniqueName('Round 1 (2)', ['Round 1', 'Round 1 (2)'])).toBe('Round 1 (3)');
  });
});

describe('checkSaveName (#538)', () => {
  const entries = [
    { id: 'a', name: 'Mine', mine: true },
    { id: 'b', name: 'Theirs', mine: false },
  ];

  it('rejects empty names', () => {
    expect(checkSaveName('  ', entries)).toEqual({ kind: 'empty' });
  });

  it('accepts a free name', () => {
    expect(checkSaveName('New', entries)).toEqual({ kind: 'free' });
  });

  it('offers overwriting only one of the own saves', () => {
    expect(checkSaveName('mine', entries)).toEqual({
      kind: 'own',
      id: 'a',
      suggestion: 'mine (2)',
    });
    expect(checkSaveName('Theirs', entries)).toEqual({ kind: 'taken', suggestion: 'Theirs (2)' });
  });
});
