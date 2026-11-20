/**
 * Skat: what a seat sees and may do [ID: LOGIC-TABLETOP-SCRIPT-SKAT-VIEW]
 */
import { SUIT_SYMBOL } from './cardDeck';
import type { Suit } from './cardDeck';
import {
  BASE_VALUE,
  nextBid,
  nullValue,
  sortSkatHand,
  type SkatGame,
  type SkatGameType,
} from './skatRules';
import { emptyView, msg, type ActionView, type ScriptView, type Text } from './scriptTypes';
import { SEATS, type SkatState } from './skatTypes';

const gameName = (game: SkatGame): Text => {
  if (game.type === 'grand') return msg('skat.grand');
  if (game.type === 'null') return msg(game.ouvert ? 'skat.nullOuvert' : 'skat.null');
  return SUIT_SYMBOL[game.type];
};

function declareActions(s: SkatState): ActionView[] {
  const hand = s.game?.hand ?? false;
  const suits: Suit[] = ['C', 'S', 'H', 'D'];
  const nulls = [false, true].filter((ouvert) => nullValue({ hand, ouvert }) >= s.bidding.value);
  return [
    ...suits.map((suit) => ({
      id: 'declare',
      arg: suit,
      label: `${SUIT_SYMBOL[suit]} ${BASE_VALUE[suit]}`,
    })),
    { id: 'declare', arg: 'grand', label: msg('skat.grand') },
    ...nulls.map((ouvert) => ({
      id: 'declare',
      arg: ouvert ? 'nullOuvert' : 'null',
      label: msg(ouvert ? 'skat.nullOuvert' : 'skat.null'),
    })),
  ];
}

function summary(s: SkatState): ScriptView['summary'] {
  const r = s.result;
  const rows = s.scores.map((score, seat) => ({
    seat,
    value: String(score),
    ...(r && seat === r.declarer ? { tone: r.won ? ('good' as const) : ('bad' as const) } : {}),
  }));
  if (!r) return { title: msg('skat.passedIn'), lines: [], rows };
  const lines: Text[] = [
    msg(r.won ? 'skat.resultWon' : 'skat.resultLost', { value: r.value }, r.declarer),
  ];
  if (r.game.type !== 'null') lines.push(msg('skat.points', { points: r.points }));
  if (r.schwarz) lines.push(msg('skat.schwarz'));
  else if (r.schneider) lines.push(msg('skat.schneider'));
  if (r.overbid) lines.push(msg('skat.overbid', { bid: r.bid }));
  return { title: msg(r.won ? 'skat.won' : 'skat.lost', undefined, r.declarer), lines, rows };
}

export function skatView(s: SkatState, viewer: number | null): ScriptView {
  const v = emptyView(SEATS);
  const over = s.phase === 'roundEnd';
  const type: SkatGameType = s.phase === 'play' || over ? (s.game?.type ?? 'grand') : 'grand';
  const open = s.phase === 'play' && s.game?.ouvert && s.declarer !== null;
  v.seats = s.hands.map((hand, seat) => ({
    cards: hand.length,
    chips: [
      ...(seat === s.declarer ? [msg('skat.declarer')] : []),
      ...(seat === s.dealer ? [msg('skat.dealer')] : []),
      ...(s.phase === 'play' ? [msg('skat.tricks', { count: s.tricks[seat] })] : []),
      String(s.scores[seat]),
    ],
    ...(open && seat === s.declarer ? { revealed: sortSkatHand(hand, type) } : {}),
  }));
  v.active = over ? [] : [s.turn];
  if (s.bidding.value > 0) v.info.push(msg('skat.bidInfo', { value: s.bidding.value }));
  if (s.game && s.phase === 'play') {
    v.info.push(gameName(s.game));
    if (s.game.hand) v.info.push(msg('skat.hand'));
  }
  v.piles = [
    { id: 'trick', kind: 'row', cards: s.trick.map((p) => ({ id: p.card, seat: p.seat })) },
    ...(s.phase === 'play' || over
      ? []
      : [
          {
            id: 'skat',
            kind: 'stock' as const,
            label: msg('skat.skat'),
            cards: [],
            count: s.skat.length,
          },
        ]),
  ];
  if (viewer !== null) v.hand = sortSkatHand(s.hands[viewer], type);
  if (over) {
    v.summary = summary(s);
    v.status = v.summary!.title;
    v.actions = [{ id: 'next', label: msg('nextRound'), tone: 'primary' }];
    return v;
  }
  const mine = viewer === s.turn;
  const b = s.bidding;
  switch (s.phase) {
    case 'bidding': {
      const next = nextBid(b.value);
      if (b.turn === 'listener') {
        v.status = msg('skat.asked', { value: b.value }, b.listener);
        if (mine)
          v.actions = [
            { id: 'hold', label: msg('skat.hold', { value: b.value }), tone: 'primary' },
            { id: 'pass', label: msg('skat.pass') },
          ];
      } else {
        v.status = msg('skat.bids', undefined, b.speaker);
        if (mine)
          v.actions = [
            ...(next
              ? [{ id: 'bid', arg: next, label: String(next), tone: 'primary' as const }]
              : []),
            { id: 'pass', label: msg('skat.pass') },
          ];
      }
      break;
    }
    case 'pickup':
      v.status = msg('skat.decides', undefined, s.turn);
      if (mine)
        v.actions = [
          { id: 'pickup', label: msg('skat.pickup'), tone: 'primary' },
          { id: 'hand', label: msg('skat.playHand') },
        ];
      break;
    case 'discard':
      v.status = msg('skat.discards', undefined, s.turn);
      if (mine) {
        v.select = 'many';
        v.playLabel = msg('skat.discard');
      }
      break;
    case 'declare':
      v.status = msg('skat.declares', undefined, s.turn);
      if (mine) v.actions = declareActions(s);
      break;
    case 'play':
      v.status =
        s.trick.length === SEATS
          ? msg('skat.trickTo', undefined, s.turn)
          : msg('turn', undefined, s.turn);
      if (mine) {
        v.select = 'one';
        v.playLabel = msg('play');
      }
      break;
  }
  return v;
}
