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

/** Redacts private cards in a widget map; `owners` decides which cards are private. */
function redactWidgets<T extends Record<string, TabletopWidget | null>>(
  widgets: T,
  owners: Map<string, number>,
): { widgets: T; secrets: SeatSecrets } {
  const out: Record<string, TabletopWidget | null> = { ...widgets };
  const secrets: SeatSecrets = {};
  for (const [id, w] of Object.entries(widgets)) {
    const seat = owners.get(id);
    if (seat === undefined || !w || w.type !== 'card') continue;
    out[id] = redactCard(w as CardWidget);
    (secrets[seat] ??= {})[id] = secretOf(w as CardWidget);
  }
  return { widgets: out as T, secrets };
}

/** A full game for broadcast, plus the faces each seat may restore. */
export function redactGame(game: TabletopGameDefinition): {
  game: TabletopGameDefinition;
  secrets: SeatSecrets;
} {
  const { widgets, secrets } = redactWidgets(game.widgets, privateCardOwners(game.widgets));
  return { game: { ...game, widgets }, secrets };
}

/** A delta for broadcast; ownership is taken from the game after the change. */
export function redactDelta(
  delta: GameDelta,
  gameAfter: TabletopGameDefinition,
): { delta: GameDelta; secrets: SeatSecrets } {
  const { widgets, secrets } = redactWidgets(delta.widgets, privateCardOwners(gameAfter.widgets));
  return { delta: { ...delta, widgets }, secrets };
}

/** Puts this seat's real faces back into received widgets. */
export function restoreCards<T extends Record<string, TabletopWidget | null>>(
  widgets: T,
  secrets: Record<string, CardSecret> | undefined,
): T {
  if (!secrets) return widgets;
  const out: Record<string, TabletopWidget | null> = { ...widgets };
  for (const [id, secret] of Object.entries(secrets)) {
    const w = out[id];
    if (w && w.type === 'card') {
      out[id] = { ...(w as CardWidget), ...secret, faceObjects: secret.faceObjects } as CardWidget;
    }
  }
  return out as T;
}
