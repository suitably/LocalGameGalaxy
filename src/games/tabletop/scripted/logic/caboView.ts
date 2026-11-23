/**
 * What a seat (or the table) sees of a Cabo game [ID: LOGIC-TABLETOP-SCRIPT-CABO-VIEW]
 *
 * Hand cards stay face down for everyone, owner included, except while the seat to act looks at
 * one: its bottom two in the start peek, a peeked card during `reveal`. All open after a round.
 */
import { cardText } from './cardDeck';
import { PENALTY, START_PEEK, TARGET, powerOf, type CaboState } from './caboRules';
import { emptyView, msg, type ActionView, type ScriptView, type SlotRef } from './scriptTypes';

/** What `viewer` sees of `seat`'s slot. */
function visible(s: CaboState, viewer: number | null, seat: number, slot: number): boolean {
  if (s.phase === 'roundEnd' || s.phase === 'matchEnd') return true;
  if (viewer !== null && s.memoryAid && s.seen[viewer]?.includes(s.hands[seat][slot])) return true;
  if (viewer === null || viewer !== s.turn) return false;
  if (s.phase === 'peek') return seat === viewer && START_PEEK.includes(slot);
  return s.phase === 'reveal' && s.revealed?.seat === seat && s.revealed.slot === slot;
}

const slotsOf = (s: CaboState, filter: (seat: number) => boolean): SlotRef[] =>
  s.hands.flatMap((h, seat) => (filter(seat) ? h.map((_, slot) => ({ seat, slot })) : []));

function turnView(s: CaboState, v: ScriptView, mine: boolean): void {
  const own = (seat: number) => seat === s.turn;
  const actions: ActionView[] = [];
  if (s.phase === 'peek') {
    v.status = msg('cabo.peek', undefined, s.turn);
    actions.push({ id: 'seen', label: msg('cabo.seen'), tone: 'primary' });
  } else if (s.phase === 'turn') {
    v.status = msg('turn', undefined, s.turn);
    actions.push({ id: 'drawStock', label: msg('cabo.drawStock'), tone: 'primary' });
    if (s.discard.length > 0) actions.push({ id: 'takeDiscard', label: msg('cabo.takeDiscard') });
    if (s.caller === null) actions.push({ id: 'cabo', label: msg('cabo.call'), tone: 'danger' });
  } else if (s.phase === 'drawn' && s.drawn) {
    v.status = msg('cabo.place', undefined, s.turn);
    v.slotTargets = slotsOf(s, own);
    if (s.drawn.fromStock) {
      const power = powerOf(s.drawn.card);
      actions.push({
        id: 'discard',
        label: msg(power ? `cabo.discardFor.${power}` : 'cabo.discard'),
      });
    }
  } else if (s.phase === 'power' && s.power) {
    v.status = msg(`cabo.power.${s.power}`, undefined, s.turn);
    const pickOwn = s.power === 'peekOwn' || (s.power === 'blindSwap' && s.swapFrom === null);
    v.slotTargets = slotsOf(s, (seat) => (pickOwn ? own(seat) : !own(seat)));
    if (s.power === 'blindSwap' && s.swapFrom !== null) {
      v.slotTargets.push(...slotsOf(s, own));
      v.info.push(msg('cabo.swapFrom', { n: s.swapFrom + 1 }));
    }
    actions.push({ id: 'skip', label: msg('cabo.skip') });
  } else if (s.phase === 'reveal') {
    v.status = msg('cabo.looking', undefined, s.turn);
    actions.push({ id: 'endTurn', label: msg('cabo.endTurn'), tone: 'primary' });
  }
  if (mine) v.actions = actions;
  else v.slotTargets = [];
}

export function caboView(s: CaboState, viewer: number | null): ScriptView {
  const v = emptyView(s.hands.length);
  const over = s.phase === 'roundEnd' || s.phase === 'matchEnd';
  v.seats = s.hands.map((hand, seat) => ({
    cards: 0,
    chips: [
      msg('cabo.total', { points: s.totals[seat] }),
      ...(s.caller === seat ? [msg('cabo.called')] : []),
    ],
    slots: hand.map((card, slot) => (visible(s, viewer, seat, slot) ? card : null)),
    // One row of four: on a phone two rows push the table out of view (#800).
    slotColumns: 4,
  }));
  v.active = over ? [] : [s.turn];
  const drawnOpen = s.drawn && (viewer === s.turn || !s.drawn.fromStock);
  v.piles = [
    { id: 'stock', kind: 'stock', cards: [], count: s.stock.length },
    { id: 'discard', kind: 'row', cards: s.discard.slice(-1).map((id) => ({ id })) },
    ...(s.drawn
      ? [
          drawnOpen
            ? {
                id: 'drawn',
                kind: 'row' as const,
                label: msg('cabo.drawn'),
                cards: [{ id: s.drawn.card }],
              }
            : {
                id: 'drawn',
                kind: 'stock' as const,
                label: msg('cabo.drawn'),
                cards: [],
                count: 1,
              },
        ]
      : []),
  ];
  if (s.caller !== null && !over) v.info.push(msg('cabo.lastLap', undefined, s.caller));
  if (!over) {
    turnView(s, v, viewer === s.turn);
    if (viewer === s.turn && s.drawn)
      v.info.push(msg('cabo.drew', { card: cardText(s.drawn.card) }));
    return v;
  }
  const best = Math.min(...s.totals);
  v.status =
    s.phase === 'matchEnd' ? msg('cabo.won', undefined, s.totals.indexOf(best)) : msg('roundOver');
  const r = s.result;
  v.summary = {
    title: v.status,
    lines: [
      ...(r?.penalty && s.caller !== null
        ? [msg('cabo.penalty', { points: PENALTY }, s.caller)]
        : []),
      ...(r?.resets ?? []).map((seat) => msg('cabo.reset', { points: TARGET / 2 }, seat)),
    ],
    rows: s.hands.map((cards, seat) => ({
      seat,
      cards,
      value: String(r?.scores[seat] ?? 0),
      note: msg('cabo.total', { points: s.totals[seat] }),
      ...(s.phase === 'matchEnd' && s.totals[seat] === best ? { tone: 'good' as const } : {}),
    })),
  };
  v.actions = [
    { id: 'next', label: msg(s.phase === 'matchEnd' ? 'newMatch' : 'nextRound'), tone: 'primary' },
  ];
  return v;
}
