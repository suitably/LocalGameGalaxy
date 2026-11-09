import { describe, it, expect } from 'vitest';
import {
  ROUTINE_TEMPLATE_IDS,
  appendSteps,
  ifStep,
  makeTrigger,
  routineTemplate,
  triggerTarget,
  triggerTargets,
} from '../routineTemplates';
import { parseRoutine, parseTriggers } from '../routines';
import { hand, wid } from './routineFixture';

const widgets = {
  deck: wid('deck', { type: 'deck', cardIds: [] }),
  h0: hand('h0', 0),
  h1: hand('h1', 1),
  score: wid('score', { type: 'counter', value: 0, label: 'Score' }),
};

describe('routine templates and editor helpers (#694)', () => {
  it('every template is a valid routine for the game', () => {
    for (const id of ROUTINE_TEMPLATE_IDS) {
      expect(parseRoutine(routineTemplate(id, widgets))).toMatchObject({ ok: true });
    }
    expect(routineTemplate('roll_my_dice', widgets)).toEqual([{ op: 'ROLL', seat: 'caller' }]);
    expect(routineTemplate('next_turn', widgets)).toEqual([{ op: 'TURN' }]);
    expect(routineTemplate('shuffle_and_deal', widgets)[1]).toEqual({
      op: 'DEAL',
      deck: 'deck',
      count: 5,
    });
  });

  it('appends steps to the routine text and builds IF steps', () => {
    const text = appendSteps('[{"op":"TURN"}]', [{ op: 'ROLL', seat: 'caller' }]);
    expect(JSON.parse(text)).toEqual([{ op: 'TURN' }, { op: 'ROLL', seat: 'caller' }]);
    expect(JSON.parse(appendSteps('not json', [{ op: 'TURN' }]))).toEqual([{ op: 'TURN' }]);
    const step = ifStep({ left: { of: 'counter', widget: 'score' }, cmp: '>=', right: 10 });
    expect(parseRoutine([step])).toMatchObject({ ok: true });
  });

  it('lists trigger targets and round-trips picked triggers', () => {
    const game = { widgets, hiddenZones: { z: { id: 'z', x: 0, y: 0, width: 1, height: 1 } } };
    expect(triggerTargets('onDrop', game).map((o) => o.value)).toEqual(['deck', 'h0', 'h1']);
    expect(triggerTargets('onCounter', game)).toEqual([{ value: 'score', label: 'Score (score)' }]);
    expect(triggerTargets('onEnterZone', game).map((o) => o.value)).toEqual(['z']);
    expect(triggerTargets('onTurnStart', game).map((o) => o.value)).toEqual(['', '0', '1']);
    const picked = [
      makeTrigger('onDrop', 'h0'),
      makeTrigger('onTurnStart', ''),
      makeTrigger('onTurnStart', '1'),
      makeTrigger('onCounter', 'score'),
    ];
    expect(parseTriggers(picked)).toMatchObject({ ok: true });
    expect(picked.map((t) => triggerTarget(t!))).toEqual(['h0', '', '1', 'score']);
    expect(makeTrigger('onEnterZone', '')).toBeNull();
  });
});
