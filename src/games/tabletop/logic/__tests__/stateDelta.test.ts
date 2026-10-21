import { describe, it, expect } from 'vitest';
import { applyGameDelta, diffGame } from '../stateDelta';
import type { TabletopGameDefinition, TabletopWidget } from '../types';

const widget = (id: string, x = 0) => ({ id, type: 'token', x, y: 0 }) as unknown as TabletopWidget;

const game = (widgets: TabletopWidget[]): TabletopGameDefinition =>
  ({
    id: 'g',
    name: 'G',
    version: '1',
    minPlayers: 1,
    maxPlayers: 4,
    supportedModes: ['local_pass_and_play'],
    table: { width: 100, height: 100 },
    widgets: Object.fromEntries(widgets.map((w) => [w.id, w])),
  }) as TabletopGameDefinition;

describe('stateDelta (#449)', () => {
  it('returns null when nothing changed', () => {
    const g = game([widget('a')]);
    expect(diffGame(g, g)).toBeNull();
    expect(diffGame(g, { ...g })).toBeNull();
  });

  it('carries changed, added and removed widgets and changed fields', () => {
    const a = widget('a');
    const prev = game([a, widget('b')]);
    const next = {
      ...prev,
      table: { width: 200, height: 100 },
      widgets: { a, c: widget('c'), d: widget('d', 5) },
    } as TabletopGameDefinition;
    const delta = diffGame(prev, next);
    expect(delta).toEqual({
      widgets: { c: next.widgets.c, d: next.widgets.d, b: null },
      fields: { table: { width: 200, height: 100 } },
    });
    expect(applyGameDelta(prev, delta!)).toEqual(next);
  });

  it('a moved widget round-trips through diff and apply', () => {
    const prev = game([widget('a'), widget('b')]);
    const next = { ...prev, widgets: { ...prev.widgets, a: widget('a', 42) } };
    const applied = applyGameDelta(prev, diffGame(prev, next)!);
    expect(applied.widgets.a).toEqual(widget('a', 42));
    expect(applied.widgets.b).toBe(prev.widgets.b);
  });
});
