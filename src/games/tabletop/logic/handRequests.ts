/**
 * Requests between two seats about the cards in a hand [ID: LOGIC-TABLETOP-HAND-REQUESTS]
 *
 * #557: a seat asks to see cards in another seat's hand (chosen by position, or "any N"), the
 * owner shows them, a random pick or a chosen subset, or rejects. One request per requester →
 * owner pair and kind; it lives in the game state (`TabletopGameDefinition.handRequests`), the
 * host decides random picks from its seeded RNG, and shown faces travel only in the requester's
 * sealed box (`revealGrants` → `handPrivacy.ts`). Pure functions.
 */
import type { HolderWidget, TabletopWidget } from './types';
import { isHandHolder } from './handHolder';
import { shuffled, type Rng } from './rng';

/** What the requester wants to see: these cards (by id, chosen by position) or any N cards. */
export type ViewAsk = { mode: 'cards'; cardIds: string[] } | { mode: 'count'; count: number };

/** The owner's answer; `accept` shows the asked cards (a random pick for a count ask). */
export type ViewAnswer =
  | { type: 'accept' }
  | { type: 'reject' }
  | { type: 'random'; count: number }
  | { type: 'subset'; cardIds: string[] };

interface SeatPair {
  /** The seat that asks. */
  from: number;
  /** The seat that owns the hand and answers. */
  to: number;
}

export type ViewRequest = SeatPair & { kind: 'view' } & (
    | { status: 'pending'; ask: ViewAsk }
    | { status: 'shown'; cardIds: string[] }
    | { status: 'rejected' }
  );

export type HandRequest = ViewRequest;
export type HandRequestKind = HandRequest['kind'];
export type HandRequests = Record<string, HandRequest>;

declare module './types' {
  interface TabletopGameDefinition {
    /** Open requests between seats, synced like hidden zones; never removed, only emptied. */
    handRequests?: HandRequests;
  }
}

/** Payload of the `HAND_REQUEST` action. `close` withdraws a pending request or dismisses a result. */
export type HandRequestOp =
  | (SeatPair & { op: 'ask'; ask: ViewAsk })
  | (SeatPair & { op: 'close'; kind: HandRequestKind })
  | (SeatPair & { op: 'answer'; kind: 'view'; answer: ViewAnswer });

export const requestKey = (kind: HandRequestKind, from: number, to: number): string =>
  `${kind}:${from}>${to}`;

/** Cards in the hand holders a seat owns, in holder and position order. */
export function handCardIds(widgets: Record<string, TabletopWidget>, seat: number): string[] {
  const ids: string[] = [];
  for (const w of Object.values(widgets)) {
    if (w.type !== 'holder') continue;
    const holder = w as HolderWidget;
    if (holder.ownerSeat !== seat || !isHandHolder(holder)) continue;
    for (const id of holder.childIds ?? []) if (widgets[id]?.type === 'card') ids.push(id);
  }
  return ids;
}

/** Seats that own a hand holder, ascending. */
export function handSeats(widgets: Record<string, TabletopWidget>): number[] {
  const seats = new Set<number>();
  for (const w of Object.values(widgets)) {
    const holder = w as HolderWidget;
    if (w.type === 'holder' && typeof holder.ownerSeat === 'number' && isHandHolder(holder)) {
      seats.add(holder.ownerSeat);
    }
  }
  return [...seats].sort((a, b) => a - b);
}

/** `ids` that are still in `hand`, in hand order, without duplicates. */
const inHand = (ids: readonly string[], hand: readonly string[]): string[] =>
  hand.filter((id) => ids.includes(id));

/** `count` cards of `hand` picked at random, in hand order. */
export const randomPick = (hand: readonly string[], count: number, rng: Rng): string[] =>
  inHand(shuffled(hand, rng).slice(0, Math.max(0, Math.floor(count))), hand);

/** The ask limited to the owner's current hand; `null` when nothing is left to ask for. */
export function normalizeAsk(ask: ViewAsk, hand: readonly string[]): ViewAsk | null {
  if (ask.mode === 'cards') {
    const cardIds = inHand(ask.cardIds, hand);
    return cardIds.length > 0 ? { mode: 'cards', cardIds } : null;
  }
  const count = Math.min(Math.floor(ask.count), hand.length);
  return count > 0 ? { mode: 'count', count } : null;
}

/** Number of cards an ask is about. */
export const askSize = (ask: ViewAsk): number =>
  ask.mode === 'cards' ? ask.cardIds.length : ask.count;

/** Extends or reduces a position ask by one card (toggle); a count ask becomes a position ask. */
export function toggleAskedCard(ask: ViewAsk | null, cardId: string): ViewAsk | null {
  const ids = ask?.mode === 'cards' ? ask.cardIds : [];
  const cardIds = ids.includes(cardId) ? ids.filter((id) => id !== cardId) : [...ids, cardId];
  return cardIds.length > 0 ? { mode: 'cards', cardIds } : null;
}

/**
 * The map without one request. Stays an object when empty: a removed top-level field would be
 * `undefined` in the delta, which JSON drops, so devices would keep the old requests.
 */
const without = (requests: HandRequests, key: string): HandRequests => {
  const rest = { ...requests };
  delete rest[key];
  return rest;
};

/** Cards the owner shows for an answer; empty = rejected. */
function shownCards(ask: ViewAsk, answer: ViewAnswer, hand: string[], rng: Rng): string[] {
  switch (answer.type) {
    case 'reject':
      return [];
    case 'accept':
      return ask.mode === 'cards' ? inHand(ask.cardIds, hand) : randomPick(hand, ask.count, rng);
    case 'random':
      return randomPick(hand, answer.count, rng);
    case 'subset':
      return inHand(answer.cardIds, hand);
  }
}

/**
 * Applies one request operation. Returns the same object when nothing changes (invalid pair,
 * unknown request, empty ask). Who may send which operation is checked by the host
 * (`authorizeSeatIntent`): `ask`/`close` only by `from`, `answer` only by `to`.
 */
export function applyHandRequest(
  requests: HandRequests | undefined,
  op: HandRequestOp,
  widgets: Record<string, TabletopWidget>,
  rng: Rng,
): HandRequests | undefined {
  if (op.from === op.to) return requests;
  const all = requests ?? {};
  switch (op.op) {
    case 'ask': {
      const key = requestKey('view', op.from, op.to);
      const ask = normalizeAsk(op.ask, handCardIds(widgets, op.to));
      // Reduced to nothing: withdraws a pending request; a shown result stays until dismissed.
      if (!ask) return all[key]?.status === 'pending' ? without(all, key) : requests;
      const next: ViewRequest = { kind: 'view', from: op.from, to: op.to, status: 'pending', ask };
      if (JSON.stringify(all[key]) === JSON.stringify(next)) return requests;
      return { ...all, [key]: next };
    }
    case 'close': {
      const key = requestKey(op.kind, op.from, op.to);
      return key in all ? without(all, key) : requests;
    }
    case 'answer': {
      const key = requestKey('view', op.from, op.to);
      const current = all[key];
      if (current?.status !== 'pending') return requests;
      const cardIds = shownCards(current.ask, op.answer, handCardIds(widgets, op.to), rng);
      const pair = { kind: 'view' as const, from: op.from, to: op.to };
      const next: ViewRequest =
        cardIds.length > 0
          ? { ...pair, status: 'shown', cardIds }
          : { ...pair, status: 'rejected' };
      return { ...all, [key]: next };
    }
  }
}

/**
 * Card id → seats (besides the owner) that may see its face: shown view requests whose card is
 * still in the owner's hand. `owners` is `privateCardOwners` of the same widgets.
 */
export function revealGrants(
  requests: HandRequests | undefined,
  owners: Map<string, number>,
): Map<string, number[]> {
  const grants = new Map<string, number[]>();
  for (const r of Object.values(requests ?? {})) {
    if (r.kind !== 'view' || r.status !== 'shown') continue;
    for (const id of r.cardIds) {
      if (owners.get(id) !== r.to) continue;
      const seats = grants.get(id) ?? [];
      if (!seats.includes(r.from))
        grants.set(
          id,
          [...seats, r.from].sort((a, b) => a - b),
        );
    }
  }
  return grants;
}
