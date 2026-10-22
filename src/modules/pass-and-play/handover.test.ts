import { describe, expect, it } from 'vitest';
import { handoverReducer, nextPlayerId, type HandoverPlayer } from './handover';

const players: HandoverPlayer[] = [
  { id: 'a', name: 'Anna' },
  { id: 'b', name: 'Ben' },
  { id: 'c', name: 'Cem' },
];

describe('pass and play handover', () => {
  it('picks the next player in turn order and wraps around', () => {
    expect(nextPlayerId(players, 'a')).toBe('b');
    expect(nextPlayerId(players, 'c')).toBe('a');
    expect(nextPlayerId(players, null)).toBe('a');
    expect(nextPlayerId(players, 'unknown')).toBe('a');
    expect(nextPlayerId([], 'a')).toBeNull();
  });

  it('covers for the next player, can be pointed elsewhere, and reveals', () => {
    let state = handoverReducer({ phase: 'playing' }, { type: 'START', players, currentId: 'b' });
    expect(state).toEqual({ phase: 'covered', playerId: 'c' });
    state = handoverReducer(state, { type: 'RETARGET', playerId: 'a' });
    expect(state).toEqual({ phase: 'covered', playerId: 'a' });
    expect(handoverReducer(state, { type: 'REVEAL' })).toEqual({ phase: 'playing' });
    expect(handoverReducer(state, { type: 'CANCEL' })).toEqual({ phase: 'playing' });
  });

  it('ignores a retarget while playing and a start without players', () => {
    expect(handoverReducer({ phase: 'playing' }, { type: 'RETARGET', playerId: 'a' })).toEqual({
      phase: 'playing',
    });
    expect(handoverReducer({ phase: 'playing' }, { type: 'START', players: [] })).toEqual({
      phase: 'playing',
    });
  });
});
