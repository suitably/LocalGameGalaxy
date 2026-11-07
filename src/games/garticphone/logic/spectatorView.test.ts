import { describe, expect, it } from 'vitest';
import { createInitialGarticState, submitPlayerGarticStep } from '../garticEngine';
import { garticSpectatorView } from './spectatorView';

const players = [
  { id: 'a', name: 'Ana', ready: true },
  { id: 'b', name: 'Ben', ready: true },
];

describe('garticSpectatorView (#659)', () => {
  it('shows the task, then what the player sent', () => {
    let state = createInitialGarticState('a', 'Ana', 'R', players);
    expect(garticSpectatorView(state, 'a')).toEqual({ task: 'prompt', received: null, sent: null });
    state = submitPlayerGarticStep(state, 'a', 'A cat on a bike');
    expect(garticSpectatorView(state, 'a')?.sent?.content).toBe('A cat on a bike');
    expect(garticSpectatorView(state, 'b')?.sent).toBeNull();
    // Round 2: b draws what a wrote.
    state = submitPlayerGarticStep(state, 'b', 'A dog');
    const b = garticSpectatorView(state, 'b');
    expect(b?.task).toBe('drawing');
    expect(b?.received?.content).toBe('A cat on a bike');
    expect(b?.sent).toBeNull();
    state = submitPlayerGarticStep(state, 'b', '{"elements":[]}');
    expect(garticSpectatorView(state, 'b')?.sent?.type).toBe('drawing');
    expect(garticSpectatorView(state, 'b')?.received?.content).toBe('A cat on a bike');
  });

  it('shows nothing outside the play phases', () => {
    const state = {
      ...createInitialGarticState('a', 'Ana', 'R', players),
      phase: 'reveal' as const,
    };
    expect(garticSpectatorView(state, 'a')).toBeNull();
  });
});
