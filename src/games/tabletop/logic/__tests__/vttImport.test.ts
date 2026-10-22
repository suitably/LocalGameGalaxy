import { describe, expect, it } from 'vitest';
import { normalizePcioWidgets } from '../pcioNormalizer';
import { parsePcioFile, pickStateJson, readVttMeta } from '../pcioParser';
import { parseVttTime } from '../vttWidgets';
import type {
  ButtonWidget,
  DieWidget,
  LabelWidget,
  SpinnerWidget,
  TimerWidget,
  TokenWidget,
} from '../types';

describe('VirtualTabletop import', () => {
  it('keeps label, button, spinner and timer types', () => {
    const out = normalizePcioWidgets({
      title: { type: 'label', x: 10, y: 20, text: 'Score' },
      deal: {
        type: 'button',
        x: 0,
        y: 0,
        text: 'Deal',
        deck: 'cards',
        clickRoutine: [{ func: 'SHUFFLE' }],
      },
      wheel: { type: 'spinner', x: 0, y: 0, options: ['A', 'B', 'C'], value: 'B', angle: 90 },
      clock: { type: 'timer', x: 0, y: 0, countdown: true, start: '1:30', milliseconds: 60000 },
    });
    expect(out.title).toMatchObject({
      type: 'label',
      text: 'Score',
      x: 10,
      y: 20,
    } satisfies Partial<LabelWidget>);
    // A `deck` property no longer turns a button into a card.
    expect(out.deal).toMatchObject({
      type: 'button',
      text: 'Deal',
      routine: [],
    } satisfies Partial<ButtonWidget>);
    expect(out.wheel).toMatchObject({
      type: 'spinner',
      options: ['A', 'B', 'C'],
      value: 1,
      angle: 90,
    } satisfies Partial<SpinnerWidget>);
    expect(out.clock).toMatchObject({
      type: 'timer',
      durationMs: 90000,
      elapsedMs: 30000,
    } satisfies Partial<TimerWidget>);
  });

  it('reads dice faces and the active face', () => {
    const out = normalizePcioWidgets({
      d8: { type: 'dice', x: 0, y: 0, faces: [1, 2, 3, 4, 5, 6, 7, 8], activeFace: 6 },
    });
    expect(out.d8).toMatchObject({
      type: 'die',
      sides: 8,
      currentValue: 7,
    } satisfies Partial<DieWidget>);
  });

  it('turns a basic widget with several faces into switchable states', () => {
    const out = normalizePcioWidgets({
      cup: {
        x: 0,
        y: 0,
        image: '/i/cup.svg',
        faces: [{ text: 'up' }, { text: 'down', image: '/i/down.svg' }],
        activeFace: 1,
      },
    });
    const cup = out.cup as TokenWidget;
    expect(cup.states?.map((s) => s.label)).toEqual(['up', 'down']);
    expect(cup.stateIndex).toBe(1);
  });

  it('reads _meta instead of creating a widget from it', async () => {
    const game = await parsePcioFile(
      JSON.stringify({
        _meta: { version: 24, info: { name: 'Hearts', rules: 'Avoid hearts.', players: '3-5' } },
        card1: { type: 'label', x: 0, y: 0, text: 'x' },
      }),
    );
    expect(game.name).toBe('Hearts');
    expect(game.ruleText).toBe('Avoid hearts.');
    expect([game.minPlayers, game.maxPlayers]).toEqual([3, 5]);
    expect(Object.keys(game.widgets)).not.toContain('_meta');
  });

  it('picks the first variant of a .vtt archive and never an asset map', () => {
    expect(pickStateJson(['assets/1_2', '2.json', '0.json', '1.json'])).toBe('0.json');
    expect(pickStateJson(['asset-map.json', '3.json'])).toBe('3.json');
    expect(pickStateJson(['widgets.json', '0.json'])).toBe('widgets.json');
    expect(pickStateJson(['a.png'])).toBeNull();
  });

  it('parses VTT times and player ranges', () => {
    expect(parseVttTime('2:30')).toBe(150000);
    expect(parseVttTime('0:05.25')).toBe(5250);
    expect(parseVttTime(1200)).toBe(1200);
    expect(readVttMeta({ info: { players: '4' } })).toMatchObject({ minPlayers: 4, maxPlayers: 4 });
    expect(readVttMeta(undefined)).toEqual({});
  });
});
