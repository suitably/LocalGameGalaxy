import { describe, it, expect } from 'vitest';
import { ensureUniquePlayerName } from './disambiguateName';

describe('ensureUniquePlayerName', () => {
  it('returns base name when no conflicts exist', () => {
    const existing = [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
    ];
    expect(ensureUniquePlayerName('Charlie', existing, 'p3')).toBe('Charlie');
  });

  it('keeps name if same player id already has it', () => {
    const existing = [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
    ];
    expect(ensureUniquePlayerName('Alice', existing, 'p1')).toBe('Alice');
  });

  it('appends (2) when duplicate name is chosen by another player', () => {
    const existing = [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
    ];
    expect(ensureUniquePlayerName('Alice', existing, 'p3')).toBe('Alice (2)');
  });

  it('increments counter to (3) when (2) already exists', () => {
    const existing = [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Alice (2)' },
    ];
    expect(ensureUniquePlayerName('Alice', existing, 'p3')).toBe('Alice (3)');
  });

  it('handles case-insensitive duplicates properly', () => {
    const existing = [{ id: 'p1', name: 'ALEX' }];
    expect(ensureUniquePlayerName('alex', existing, 'p2')).toBe('alex (2)');
  });

  it('defaults empty names to Spieler', () => {
    const existing = [{ id: 'p1', name: 'Spieler' }];
    expect(ensureUniquePlayerName('', existing, 'p2')).toBe('Spieler (2)');
  });
});
