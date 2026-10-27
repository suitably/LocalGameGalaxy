/**
 * Hidden zones on the wire [ID: LOGIC-TABLETOP-ZONE-REDACTION]
 *
 * The host keeps the full state. In what it broadcasts, a widget inside a non-revealed hidden
 * zone keeps only its geometry and structure (face, image, text, colours removed); the seats that
 * may see through the zone get the widget back as a per-seat secret, sealed like private hands
 * (`privateHandChannel.ts`). Spectators and seatless devices get no secret. Pure functions.
 */
import type { GameDelta } from './stateDelta';
import type { CardContent, HiddenZone, TabletopGameDefinition, TabletopWidget } from './types';
import { findZonesContainingWidget, isWidgetHiddenForViewer } from './hiddenZoneLogic';
import { restoreCards, type SeatSecrets, type WidgetSecret } from './handPrivacy';

type Zones = Record<string, HiddenZone> | undefined;

/** widget id → what the seat may restore, per seat */
export type BroadcastSecrets = Record<number, Record<string, WidgetSecret>>;

/** Whether any zone currently hides something. */
export const hasActiveHiddenZone = (zones: Zones): boolean =>
  Object.values(zones ?? {}).some((z) => !z.revealed);

/**
 * Seats that may see a widget hidden by zones (sorted), or `null` when no zone hides it.
 * Only zone owners can be in it, and only when no other zone hides the widget from them.
 */
export function zoneAudience(widget: TabletopWidget, zones: Zones): number[] | null {
  if (!isWidgetHiddenForViewer(widget, zones, undefined)) return null;
  const owners = new Set<number>();
  for (const zone of findZonesContainingWidget(widget, zones)) {
    if (!zone.revealed && typeof zone.ownerSeat === 'number') owners.add(zone.ownerSeat);
  }
  return [...owners]
    .filter((seat) => !isWidgetHiddenForViewer(widget, zones, seat))
    .sort((a, b) => a - b);
}

/** Fields that only place or structure a widget; everything else is removed when hidden. */
const STRUCTURE_KEYS = [
  'id',
  'type',
  'x',
  'y',
  'width',
  'height',
  'zIndex',
  'ownerSeat',
  'pinned',
  'keepZOrder',
  'parent',
  'supplyHolderId',
  'display',
  'movable',
  'grid',
  'hasPileChild',
  'showAlways',
  'defaultWidth',
  'defaultHeight',
  'rotation',
  'deckId',
  'inPile',
  'pileId',
  'stackCount',
  'faceUp',
  'cardIds',
  'isPile',
  'cardCount',
  'childIds',
  'dropTargetTypes',
  'layout',
  'isHand',
  'dropTarget',
  'step',
  'min',
  'max',
  'sides',
  'index',
  'isInfinite',
  'itemCount',
  'itemIds',
  'durationMs',
  'elapsedMs',
  'runningSince',
  'angle',
] as const;

const BLANK: CardContent = { type: 'text', value: '' };

/** Neutral values for required content fields, so a hidden widget stays a valid widget. */
const REQUIRED_BLANKS: Partial<Record<TabletopWidget['type'], Record<string, unknown>>> = {
  card: { frontContent: BLANK, backContent: BLANK },
  deck: { backContent: BLANK },
  counter: { value: 0 },
  die: { currentValue: 0 },
  seat: { color: '' },
  label: { text: '' },
  spinner: { options: [] },
  button: { text: '', routine: [] },
};

/** The widget as a device that may not see it receives it: geometry and structure only. */
export function redactHiddenWidget(widget: TabletopWidget): TabletopWidget {
  const source = widget as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = { ...REQUIRED_BLANKS[widget.type] };
  for (const key of STRUCTURE_KEYS) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out as unknown as TabletopWidget;
}

/**
 * Applies hidden-zone redaction on top of the hand redaction of the same widgets.
 * `full` is the host's data, `hand` its hand-redacted form with the per-seat card faces.
 * A seat in a widget's zone audience gets the widget as the hand rules let it see it; a seat
 * outside the audience loses its card face for that widget too.
 */
export function redactZoneWidgets<T extends Record<string, TabletopWidget | null>>(
  full: T,
  hand: { widgets: T; secrets: SeatSecrets },
  zones: Zones,
): { widgets: T; secrets: BroadcastSecrets } {
  const widgets: Record<string, TabletopWidget | null> = { ...hand.widgets };
  const secrets: BroadcastSecrets = {};
  for (const [seat, cards] of Object.entries(hand.secrets)) secrets[Number(seat)] = { ...cards };
  if (!hasActiveHiddenZone(zones)) return { widgets: widgets as T, secrets };

  for (const [id, w] of Object.entries(full)) {
    const audience = w ? zoneAudience(w, zones) : null;
    if (!w || !audience) continue;
    widgets[id] = redactHiddenWidget(w);
    for (const seat of Object.keys(secrets).map(Number)) {
      if (!audience.includes(seat)) delete secrets[seat][id];
    }
    const handView = hand.widgets[id] ?? w;
    for (const seat of audience) {
      (secrets[seat] ??= {})[id] = restoreCards({ [id]: handView }, hand.secrets[seat])[id]!;
    }
  }
  for (const seat of Object.keys(secrets).map(Number)) {
    if (Object.keys(secrets[seat]).length === 0) delete secrets[seat];
  }
  return { widgets: widgets as T, secrets };
}

const audienceKey = (widget: TabletopWidget, zones: Zones): string =>
  JSON.stringify(zoneAudience(widget, zones));

/**
 * Adds unchanged widgets whose visibility changed because the zones changed (revealed, hidden
 * again, moved, resized, removed, new owner), so devices get the real data back or lose it.
 */
export function withZoneVisibilityChanges(
  delta: GameDelta,
  before: Pick<TabletopGameDefinition, 'hiddenZones'>,
  after: Pick<TabletopGameDefinition, 'widgets' | 'hiddenZones'>,
): GameDelta {
  if (before.hiddenZones === after.hiddenZones) return delta;
  let widgets: GameDelta['widgets'] | null = null;
  for (const [id, w] of Object.entries(after.widgets)) {
    if (id in delta.widgets) continue;
    if (audienceKey(w, before.hiddenZones) === audienceKey(w, after.hiddenZones)) continue;
    (widgets ??= { ...delta.widgets })[id] = w;
  }
  return widgets ? { ...delta, widgets } : delta;
}
