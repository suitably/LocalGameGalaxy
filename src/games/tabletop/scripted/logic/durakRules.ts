/**
 * Durak table settings and passing on (perevodnoy) [ID: LOGIC-TABLETOP-SCRIPT-DURAK-RULES]
 */
import { nextSeat, rankOf, without, type CardId } from './cardDeck';
import { optionOn, type ScriptOption, type ScriptOptions } from './scriptTypes';
import type { DurakState } from './durak';

export const HAND_SIZE = 6;

export type DurakRules = { transfer: boolean; neighbours: boolean };

export const DURAK_OPTIONS: readonly ScriptOption[] = [
  {
    id: 'transfer',
    label: 'durak.option.transfer',
    hint: 'durak.option.transferHint',
    default: true,
  },
  {
    id: 'neighbours',
    label: 'durak.option.neighbours',
    hint: 'durak.option.neighboursHint',
    default: true,
  },
];

export const rulesOf = (options?: ScriptOptions): DurakRules => ({
  transfer: optionOn(DURAK_OPTIONS, options, 'transfer'),
  neighbours: optionOn(DURAK_OPTIONS, options, 'neighbours'),
});

/**
 * Defender cards that pass the attack on (perevodnoy): nothing beaten yet, same rank as the
 * attack, and the next player can take on one more card than lies on the table.
 */
export function transferCards(s: DurakState): CardId[] {
  if (!s.rules?.transfer || s.phase !== 'play' || s.turn !== s.defender) return [];
  if (s.table.length === 0 || s.table.length >= HAND_SIZE || s.table.some((p) => p.defense)) {
    return [];
  }
  const rank = rankOf(s.table[0].attack);
  const next = nextSeat(s.defender, s.hands.length, (i) => s.hands[i].length > 0);
  if (next === s.defender || s.hands[next].length < s.table.length + 1) return [];
  return s.hands[s.defender].filter((c) => rankOf(c) === rank);
}

export function transfer(s: DurakState, card: CardId): DurakState {
  if (!transferCards(s).includes(card)) return s;
  const n = s.hands.length;
  const hands = s.hands.map((h, i) => (i === s.defender ? without(h, [card]) : h));
  const defender = nextSeat(s.defender, n, (i) => hands[i].length > 0);
  return {
    ...s,
    hands,
    table: [...s.table, { attack: card, defense: null }],
    attacker: s.defender,
    defender,
    turn: defender,
    passed: [],
    limit: Math.min(HAND_SIZE, hands[defender].length),
    last: 'transferred',
  };
}
