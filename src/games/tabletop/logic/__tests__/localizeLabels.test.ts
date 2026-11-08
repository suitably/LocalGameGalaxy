import { describe, expect, it } from 'vitest';
import { localizeLabels, type Translate } from '../localizeLabels';
import { patchWidgets } from '../widgetEdits';
import type { TabletopGameDefinition, TabletopWidget } from '../types';

const dict: Record<string, string> = {
  'games.tabletop.labels.card': '{{rank}} of {{suit}}',
  'games.tabletop.labels.clubs': 'Clubs',
  'games.tabletop.labels.A': 'Ace',
  'games.tabletop.labels.discard': 'Discard pile',
};
const translate: Translate = (key, { defaultValue, ...params }) =>
  (dict[key] ?? defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_, p) => String(params[p]));

const widget = (id: string, extra: Partial<TabletopWidget>) =>
  ({ id, type: 'card', x: 0, y: 0, width: 1, height: 1, zIndex: 1, ...extra }) as TabletopWidget;
const game = (...ws: TabletopWidget[]) =>
  ({
    id: 'g',
    name: 'G',
    widgets: Object.fromEntries(ws.map((w) => [w.id, w])),
  }) as unknown as TabletopGameDefinition;

describe('localizeLabels', () => {
  it('translates keys and their params', () => {
    const out = localizeLabels(
      game(
        widget('a', {
          label: 'Kreuz Ass',
          labelKey: 'games.tabletop.labels.card',
          labelParams: { rank: 'A', suit: 'clubs' },
        }),
        widget('b', {
          label: 'Kreuz 7',
          labelKey: 'games.tabletop.labels.card',
          labelParams: { rank: 7, suit: 'clubs' },
        }),
        widget('c', { label: 'Ablagestapel', labelKey: 'games.tabletop.labels.discard' }),
        widget('d', { label: 'Mine' }),
      ),
      translate,
    );
    expect(out.widgets.a.label).toBe('Ace of Clubs');
    expect(out.widgets.b.label).toBe('7 of Clubs');
    expect(out.widgets.c.label).toBe('Discard pile');
    expect(out.widgets.d.label).toBe('Mine');
  });

  it('returns the same game when nothing changes', () => {
    const g = game(widget('d', { label: 'Mine' }));
    expect(localizeLabels(g, translate)).toBe(g);
  });

  it('drops the key once a label is edited by hand', () => {
    const g = game(
      widget('c', { label: 'Ablagestapel', labelKey: 'games.tabletop.labels.discard' }),
    );
    const edited = patchWidgets(g, { c: { label: 'Stapel' } });
    expect(edited.widgets.c.labelKey).toBeUndefined();
    expect(localizeLabels(edited, translate).widgets.c.label).toBe('Stapel');
  });
});
