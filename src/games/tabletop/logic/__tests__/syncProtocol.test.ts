import { describe, it, expect } from 'vitest';
import { classifyDelta, isSyncedIntent } from '../syncProtocol';

describe('syncProtocol (#449)', () => {
  it('applies the next delta, ignores duplicates and waits for the first snapshot', () => {
    expect(classifyDelta(3, 4)).toBe('apply');
    expect(classifyDelta(3, 3)).toBe('ignore');
    expect(classifyDelta(3, 2)).toBe('ignore');
    expect(classifyDelta(null, 7)).toBe('ignore');
  });

  it('asks for a snapshot when a delta was missed', () => {
    expect(classifyDelta(3, 5)).toBe('resync');
  });

  it('sends game actions as intents but keeps local-only ones on the device', () => {
    expect(isSyncedIntent({ type: 'MOVE_WIDGET', payload: { id: 'a', x: 1, y: 2 } })).toBe(true);
    expect(isSyncedIntent({ type: 'ROLL_DIE', payload: { dieId: 'd' } })).toBe(true);
    expect(isSyncedIntent({ type: 'FINISH_ANIMATION', payload: { animationId: 'x' } })).toBe(false);
    expect(isSyncedIntent({ type: 'APPLY_REMOTE_DELTA', payload: { widgets: {} } })).toBe(false);
  });
});
