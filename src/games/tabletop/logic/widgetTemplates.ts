/**
 * Starting values for widgets created in the editor [ID: LOGIC-TABLETOP-WIDGET-TEMPLATES]
 */
import type {
  CardWidget,
  CounterWidget,
  DieWidget,
  HolderWidget,
  LabelWidget,
  SpinnerWidget,
  TimerWidget,
  TabletopGameDefinition,
  TabletopWidget,
  TokenWidget,
} from './types';

export const NEW_WIDGET_KINDS = [
  'token',
  'card',
  'holder',
  'hand',
  'counter',
  'die',
  'label',
  'timer',
  'spinner',
] as const;
export type NewWidgetKind = (typeof NEW_WIDGET_KINDS)[number];

/** One above the highest zIndex on the table, so new widgets appear on top. */
export const topZIndex = (game: TabletopGameDefinition): number =>
  Math.max(0, ...Object.values(game.widgets).map((w) => w.zIndex || 0)) + 1;

/** A new widget of `kind` centred at (`x`, `y`). */
export function createWidget(
  kind: NewWidgetKind,
  id: string,
  x: number,
  y: number,
  zIndex: number,
): TabletopWidget {
  const at = (width: number, height: number) => ({
    id,
    x: Math.round(x - width / 2),
    y: Math.round(y - height / 2),
    width,
    height,
    zIndex,
  });
  switch (kind) {
    case 'token':
      return { ...at(60, 60), type: 'token', color: '#e53935', shape: 'circle' } as TokenWidget;
    case 'card':
      return {
        ...at(80, 120),
        type: 'card',
        frontContent: { type: 'text', value: '?' },
        backContent: { type: 'text', value: '' },
        faceUp: true,
        rotation: 0,
      } as CardWidget;
    case 'holder':
    case 'hand':
      return {
        ...at(kind === 'hand' ? 500 : 120, 160),
        type: 'holder',
        childIds: [],
        dropTargetTypes: ['card'],
        layout: kind === 'hand' ? 'fan' : 'stack',
        isHand: kind === 'hand',
        ...(kind === 'hand' ? { ownerSeat: 0 } : { dropTarget: true }),
      } as HolderWidget;
    case 'counter':
      return { ...at(120, 60), type: 'counter', value: 0, step: 1 } as CounterWidget;
    case 'die':
      return { ...at(60, 60), type: 'die', currentValue: 1, sides: 6 } as DieWidget;
    case 'label':
      return { ...at(240, 60), type: 'label', text: 'Text', fontSize: 28 } as LabelWidget;
    case 'timer':
      return { ...at(170, 56), type: 'timer', durationMs: 60_000, elapsedMs: 0 } as TimerWidget;
    case 'spinner':
      return {
        ...at(200, 200),
        type: 'spinner',
        options: ['1', '2', '3', '4', '5', '6'],
        angle: 0,
      } as SpinnerWidget;
  }
}
