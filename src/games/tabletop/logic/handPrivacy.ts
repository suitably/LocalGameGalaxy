/**
 * Which card faces are private, and how they are hidden on the wire [ID: LOGIC-TABLETOP-HAND-PRIVACY]
 *
 * The host sends cards in a seat-owned hand with their back shown instead of their front; the
 * real faces travel as a per-seat secret (encrypted in `sealCrypto.ts`). Only the device of that
 * seat can put them back. Pure functions — no crypto, no I/O.
 */
import type {
  CardContent,
  CardWidget,
  FaceObject,
  HolderWidget,
  TabletopGameDefinition,
  TabletopWidget,
} from './types';
import type { GameDelta } from './stateDelta';
import { isHandHolder } from './handHolder';
import { revealGrants } from './handRequests';

/** The parts of a card that reveal its face. */
export interface CardSecret {
  frontContent: CardContent;
  faceObjects?: FaceObject[];
  label?: string;
  cardType?: string;
}

/** card id → secret, per seat */
export type SeatSecrets = Record<number, Record<string, CardSecret>>;

/** Seat that privately owns each card held in a hand holder with an owner seat. */
export function privateCardOwners(widgets: Record<string, TabletopWidget>): Map<string, number> {
  const owners = new Map<string, number>();
  for (const w of Object.values(widgets)) {
    if (w.type !== 'holder') continue;
    const holder = w as HolderWidget;
    if (typeof holder.ownerSeat !== 'number' || !isHandHolder(holder)) continue;
    for (const id of holder.childIds ?? []) {
      if (widgets[id]?.type === 'card') owners.set(id, holder.ownerSeat);
    }
  }
  return owners;
}

const HIDDEN_FRONT: CardContent = { type: 'text', value: '' };

/** The card as other seats may see it: the back on both sides, no label. */
export function redactCard(card: CardWidget): CardWidget {
  return {
    ...card,
    frontContent: card.backContent ?? HIDDEN_FRONT,
    faceObjects: card.backFaceObjects,
    label: undefined,
    cardType: undefined,
  };
}

const secretOf = (card: CardWidget): CardSecret => ({
  frontContent: card.frontContent,
  ...(card.faceObjects ? { faceObjects: card.faceObjects } : {}),
  ...(card.label !== undefined ? { label: card.label } : {}),
  ...(card.cardType !== undefined ? { cardType: card.cardType } : {}),
});

/**
 * Redacts private cards in a widget map; `owners` decides which cards are private, `grants` which
 * other seats get a face too (cards shown through a view request, #557).
 */
function redactWidgets<T extends Record<string, TabletopWidget | null>>(
  widgets: T,
  owners: Map<string, number>,
  grants: Map<string, number[]> = new Map(),
): { widgets: T; secrets: SeatSecrets } {
  const out: Record<string, TabletopWidget | null> = { ...widgets };
  const secrets: SeatSecrets = {};
  for (const [id, w] of Object.entries(widgets)) {
    const seat = owners.get(id);
    if (seat === undefined || !w || w.type !== 'card') continue;
    out[id] = redactCard(w as CardWidget);
    for (const reader of [seat, ...(grants.get(id) ?? [])]) {
      (secrets[reader] ??= {})[id] = secretOf(w as CardWidget);
    }
  }
  return { widgets: out as T, secrets };
}

/** A full game for broadcast, plus the faces each seat may restore. */
export function redactGame(game: TabletopGameDefinition): {
  game: TabletopGameDefinition;
  secrets: SeatSecrets;
} {
  const owners = privateCardOwners(game.widgets);
  const grants = revealGrants(game.handRequests, owners);
  const { widgets, secrets } = redactWidgets(game.widgets, owners, grants);
  return { game: { ...game, widgets }, secrets };
}

/** A delta for broadcast; ownership is taken from the game after the change. */
export function redactDelta(
  delta: GameDelta,
  gameAfter: TabletopGameDefinition,
): { delta: GameDelta; secrets: SeatSecrets } {
  const owners = privateCardOwners(gameAfter.widgets);
  const grants = revealGrants(gameAfter.handRequests, owners);
  const { widgets, secrets } = redactWidgets(delta.widgets, owners, grants);
  return { delta: { ...delta, widgets }, secrets };
}

type GrantSource = Pick<TabletopGameDefinition, 'widgets' | 'handRequests'>;

const grantsOf = (game: GrantSource) =>
  revealGrants(game.handRequests, privateCardOwners(game.widgets));

/**
 * Adds unchanged cards whose view grants changed (a request was answered or dismissed, #557), so
 * the requester gets the face in its sealed box, or loses it again with the redacted copy.
 */
export function withGrantChanges(
  delta: GameDelta,
  before: GrantSource,
  after: GrantSource,
): GameDelta {
  if (before.handRequests === after.handRequests) return delta;
  const was = grantsOf(before);
  const now = grantsOf(after);
  let widgets: GameDelta['widgets'] | null = null;
  for (const id of new Set([...was.keys(), ...now.keys()])) {
    if (id in delta.widgets || !after.widgets[id]) continue;
    if (JSON.stringify(was.get(id)) === JSON.stringify(now.get(id))) continue;
    (widgets ??= { ...delta.widgets })[id] = after.widgets[id];
  }
  return widgets ? { ...delta, widgets } : delta;
}

/**
 * What a seat may restore for one widget: a card face (private hand) or the whole widget (a hidden
 * zone the seat may see through, see `hiddenZoneRedaction.ts`).
 */
export type WidgetSecret = CardSecret | TabletopWidget;

/** Puts this seat's real faces (and hidden-zone widgets) back into received widgets. */
export function restoreCards<T extends Record<string, TabletopWidget | null>>(
  widgets: T,
  secrets: Record<string, WidgetSecret> | undefined,
): T {
  if (!secrets) return widgets;
  const out: Record<string, TabletopWidget | null> = { ...widgets };
  for (const [id, secret] of Object.entries(secrets)) {
    const w = out[id];
    if (!w) continue;
    if ('type' in secret && secret.type === w.type) {
      // a whole widget (hidden zone, #551) replaces the blanked copy, marker included
      out[id] = { ...secret } as TabletopWidget;
    } else if (w.type === 'card') {
      const faceObjects = 'faceObjects' in secret ? secret.faceObjects : undefined;
      out[id] = { ...w, ...secret, faceObjects } as CardWidget;
    }
  }
  return out as T;
}
