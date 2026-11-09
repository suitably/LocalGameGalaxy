/**
 * Ready-made routines and helpers for the routine editor [ID: LOGIC-TABLETOP-ROUTINE-TEMPLATES]
 *
 * Templates are inserted into the routine JSON the author edits; they name widgets of the
 * current game where they need one (first deck), so they run without further editing.
 */
import type {
  RoutineCondition,
  RoutineStep,
  RoutineTrigger,
  TabletopGameDefinition,
  TabletopWidget,
} from './types';

export const ROUTINE_TEMPLATE_IDS = [
  'roll_my_dice',
  'next_turn',
  'shuffle_and_deal',
  'next_turn_when_empty',
] as const;
export type RoutineTemplateId = (typeof ROUTINE_TEMPLATE_IDS)[number];

type Widgets = Record<string, TabletopWidget>;

const firstOfType = (widgets: Widgets, type: TabletopWidget['type']): string | undefined =>
  Object.values(widgets)
    .filter((w) => w.type === type)
    .map((w) => w.id)
    .sort()[0];

/** Steps of a template for this game (`deck_id` where the game has no deck). */
export function routineTemplate(id: RoutineTemplateId, widgets: Widgets): RoutineStep[] {
  const deck = firstOfType(widgets, 'deck') ?? 'deck_id';
  switch (id) {
    case 'roll_my_dice':
      return [{ op: 'ROLL', seat: 'caller' }];
    case 'next_turn':
      return [{ op: 'TURN' }];
    case 'shuffle_and_deal':
      return [
        { op: 'SHUFFLE', deck },
        { op: 'DEAL', deck, count: 5 },
      ];
    case 'next_turn_when_empty':
      return [
        {
          op: 'IF',
          if: { left: { of: 'count', widget: deck }, cmp: '==', right: 0 },
          then: [{ op: 'TURN' }],
        },
      ];
  }
}

/** The routine JSON with `steps` appended; text that is no JSON list is replaced. */
export function appendSteps(text: string, steps: RoutineStep[]): string {
  let current: unknown;
  try {
    current = JSON.parse(text);
  } catch {
    current = [];
  }
  const list = Array.isArray(current) ? current : [];
  return JSON.stringify([...list, ...steps], null, 2);
}

/** An `IF` step with empty branches, for the condition builder. */
export const ifStep = (condition: RoutineCondition): RoutineStep => ({
  op: 'IF',
  if: condition,
  then: [],
  else: [],
});

export const TRIGGER_EVENTS: RoutineTrigger['on'][] = [
  'onDrop',
  'onTurnStart',
  'onEnterZone',
  'onCounter',
];

export interface TargetOption {
  value: string;
  label: string;
}

const widgetOptions = (widgets: Widgets, types: TabletopWidget['type'][]): TargetOption[] =>
  Object.values(widgets)
    .filter((w) => types.includes(w.type))
    .map((w) => ({ value: w.id, label: w.label ? `${w.label} (${w.id})` : w.id }))
    .sort((a, b) => a.label.localeCompare(b.label));

/**
 * What a trigger of this event can point at: holders/decks, hidden zones, counters, or seat
 * indices (`''` = any seat).
 */
export function triggerTargets(
  on: RoutineTrigger['on'],
  game: Pick<TabletopGameDefinition, 'widgets' | 'hiddenZones'>,
): TargetOption[] {
  switch (on) {
    case 'onDrop':
      return widgetOptions(game.widgets, ['holder', 'deck']);
    case 'onCounter':
      return widgetOptions(game.widgets, ['counter']);
    case 'onEnterZone':
      return Object.values(game.hiddenZones ?? {}).map((z) => ({
        value: z.id,
        label: z.label ? `${z.label} (${z.id})` : z.id,
      }));
    case 'onTurnStart': {
      const seats = new Set<number>();
      for (const w of Object.values(game.widgets)) {
        if (w.type === 'seat') seats.add((w as { index: number }).index);
        else if (typeof w.ownerSeat === 'number') seats.add(w.ownerSeat);
      }
      return [
        { value: '', label: '*' },
        ...[...seats].sort((a, b) => a - b).map((s) => ({ value: String(s), label: `${s + 1}` })),
      ];
    }
  }
}

/** The trigger for an event and a target picked in the editor; null when a target is missing. */
export function makeTrigger(on: RoutineTrigger['on'], target: string): RoutineTrigger | null {
  switch (on) {
    case 'onTurnStart':
      return target === '' ? { on } : { on, seat: Number(target) };
    case 'onDrop':
      return target ? { on, holder: target } : null;
    case 'onEnterZone':
      return target ? { on, zone: target } : null;
    case 'onCounter':
      return target ? { on, counter: target } : null;
  }
}

/** The target value of a trigger, as `triggerTargets` lists it. */
export function triggerTarget(trigger: RoutineTrigger): string {
  switch (trigger.on) {
    case 'onTurnStart':
      return trigger.seat === undefined ? '' : String(trigger.seat);
    case 'onDrop':
      return trigger.holder;
    case 'onEnterZone':
      return trigger.zone;
    case 'onCounter':
      return trigger.counter;
  }
}
