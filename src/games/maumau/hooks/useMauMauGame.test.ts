import { describe, it, expect } from 'vitest';
import { mauMauStageReducer, initialMauMauStage, type MauMauStage } from './useMauMauGame';
import { skatDeck } from '../logic/engine';
import type { MauMauStageAction } from './useMauMauGame';

const act = (s: MauMauStage, a: MauMauStageAction) => mauMauStageReducer(s, a);
const start = () =>
  act(initialMauMauStage, { type: 'start', playerNames: ['Ann', 'Ben'], deck: skatDeck() });

describe('mauMauStageReducer', () => {
  it('starts covered for the first player', () => {
    const s = start();
    expect(s.coverFor).toBe('p1');
    expect(s.game?.players).toHaveLength(2);
  });

  it('reveal clears the cover; drawing keeps it off', () => {
    let s = act(start(), { type: 'reveal' });
    expect(s.coverFor).toBeNull();
    s = act(s, { type: 'act', action: { type: 'draw' } });
    expect(s.game?.phase).toBe('drawn');
    expect(s.coverFor).toBeNull();
  });

  it('covers for the next player after pass', () => {
    let s = act(start(), { type: 'reveal' });
    s = act(s, { type: 'act', action: { type: 'draw' } });
    s = act(s, { type: 'act', action: { type: 'pass' } });
    expect(s.coverFor).toBe('p2');
  });

  it('ignores illegal actions', () => {
    const s = act(start(), { type: 'reveal' });
    expect(act(s, { type: 'act', action: { type: 'pass' } })).toBe(s);
  });

  it('covers the first player of the next round', () => {
    const s = act(start(), { type: 'reveal' });
    const g = s.game!;
    const done: MauMauStage = {
      game: { ...g, phase: 'round_over', winnerId: 'p1' },
      coverFor: null,
    };
    const next = act(done, { type: 'act', action: { type: 'next_round' } });
    expect(next.game?.roundNumber).toBe(2);
    expect(next.coverFor).toBe('p2');
  });

  it('restarts to setup', () => {
    expect(act(start(), { type: 'restart' })).toEqual(initialMauMauStage);
  });
});
