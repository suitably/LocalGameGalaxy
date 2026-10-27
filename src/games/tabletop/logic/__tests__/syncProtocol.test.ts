import { describe, it, expect } from 'vitest';
import type { TabletopAction } from '../tabletopReducer';
import {
  acceptIntent,
  classifyDelta,
  containsRedactedWidget,
  isSyncedIntent,
  senderIsSpectator,
} from '../syncProtocol';

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

  it('rejects every mutating intent from a spectator and accepts them from players', () => {
    const mutating: TabletopAction[] = [
      { type: 'MOVE_WIDGET', payload: { id: 'a', x: 1, y: 2 } },
      { type: 'FLIP_CARD', payload: { cardId: 'c' } },
      { type: 'DRAW_CARD', payload: { deckId: 'd' } },
      { type: 'SHUFFLE_DECK', payload: { deckId: 'd' } },
      { type: 'ROLL_DIE', payload: { dieId: 'd' } },
      { type: 'DELETE_WIDGETS', payload: { ids: ['a'] } },
      { type: 'UPDATE_COUNTER', payload: { counterId: 'c', delta: 1 } },
      { type: 'SELECT_SEAT', payload: { seatId: 's' } },
    ];
    for (const action of mutating) {
      expect(acceptIntent(action, { spectator: true })).toBe(false);
      expect(acceptIntent(action, { spectator: false })).toBe(true);
    }
  });

  it('never accepts device-local actions as intents', () => {
    expect(
      acceptIntent(
        { type: 'FINISH_ANIMATION', payload: { animationId: 'x' } },
        { spectator: false },
      ),
    ).toBe(false);
  });

  it('takes the spectator role from the host roster, not from the sender (#550)', () => {
    const roster = [{ id: 'p1' }, { id: 'p2', spectator: true }];
    expect(senderIsSpectator({ claimed: false, playerId: 'p1', roster })).toBe(false);
    // a spectator cannot opt out by leaving the flag off
    expect(senderIsSpectator({ claimed: false, playerId: 'p2', roster })).toBe(true);
    // unknown or missing player id with a roster: read-only
    expect(senderIsSpectator({ claimed: false, playerId: 'x', roster })).toBe(true);
    expect(senderIsSpectator({ claimed: false, roster })).toBe(true);
    // the own claim can only restrict
    expect(senderIsSpectator({ claimed: true, playerId: 'p1', roster })).toBe(true);
    // no party: the claim decides
    expect(senderIsSpectator({ claimed: false, roster: null })).toBe(false);
    expect(senderIsSpectator({ claimed: true, roster: null })).toBe(true);
  });

  it('rejects intents that carry a blanked hidden-zone copy (#551)', () => {
    const blank = {
      id: 'c',
      type: 'card',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      zIndex: 1,
      redacted: true,
    };
    const add = { type: 'ADD_WIDGETS', payload: { widgets: [blank] } } as unknown as TabletopAction;
    expect(containsRedactedWidget(add)).toBe(true);
    expect(acceptIntent(add, { spectator: false })).toBe(false);
    const move: TabletopAction = { type: 'MOVE_WIDGET', payload: { id: 'c', x: 1, y: 2 } };
    expect(acceptIntent(move, { spectator: false })).toBe(true);
  });
});
