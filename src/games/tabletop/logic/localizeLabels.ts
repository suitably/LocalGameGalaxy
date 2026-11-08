/**
 * Translated labels for built-in games [ID: LOGIC-TABLETOP-LOCALIZE-LABELS]
 *
 * A widget with `labelKey` gets `label = translate(labelKey, params)` on load, so starter games
 * follow the app language. Each param value is looked up under `games.tabletop.labels.<value>`
 * first (suits, ranks), falling back to the value itself (numbers). A button's `text` follows.
 */
import type { TabletopGameDefinition, TabletopWidget } from './types';

export type Translate = (
  key: string,
  options: Record<string, string | number> & { defaultValue?: string },
) => string;

const LABEL_NAMESPACE = 'games.tabletop.labels';

export function localizeLabels(
  game: TabletopGameDefinition,
  translate: Translate,
): TabletopGameDefinition {
  let changed = false;
  const widgets: Record<string, TabletopWidget> = {};
  for (const [id, w] of Object.entries(game.widgets)) {
    if (typeof w.labelKey !== 'string') {
      widgets[id] = w;
      continue;
    }
    const params = Object.fromEntries(
      Object.entries(w.labelParams ?? {}).map(([name, value]) => [
        name,
        translate(`${LABEL_NAMESPACE}.${value}`, { defaultValue: String(value) }),
      ]),
    );
    const label = translate(w.labelKey, { ...params, defaultValue: w.label ?? '' });
    // A button shows its `text`; it follows the label.
    const isButton = w.type === 'button';
    const same = label === w.label && (!isButton || w.text === label);
    widgets[id] = same
      ? w
      : ({ ...w, label, ...(isButton ? { text: label } : {}) } as TabletopWidget);
    changed ||= !same;
  }
  return changed ? { ...game, widgets } : game;
}
