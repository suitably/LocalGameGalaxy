/**
 * Scripted card games: the contract between a rule script and the table UI [ID: LOGIC-TABLETOP-SCRIPT-TYPES]
 *
 * A script is a pure state machine for one game: it deals, checks every move and describes what
 * a seat may see and do (`view`). The UI and the sync layer know no game rules.
 */
import type { Rng } from '../../logic/rng';
import type { CardId } from './cardDeck';

/** Text for the UI: plain (symbols, numbers) or an i18n key under `games.tabletop.scripted`. */
export interface Msg {
  key: string;
  params?: Record<string, string | number>;
  /** Seat whose name fills `{{name}}`. */
  seat?: number;
}
export type Text = string | Msg;

export type ScriptMove =
  /** Hand cards, optionally onto a card on the table (swap with it, beat it). */
  | { kind: 'cards'; cards: CardId[]; target?: CardId }
  | { kind: 'action'; id: string; arg?: string | number }
  /** A card lying in front of a seat, by position (flip, peek, swap in, draw blind). */
  | { kind: 'slot'; seat: number; slot: number };

/** A card at a fixed place in front of a seat: open, `null` face down for this viewer. */
export type SlotCard = CardId | null;

export interface SlotRef {
  seat: number;
  slot: number;
}

export interface SeatView {
  /** Cards in hand. */
  cards: number;
  /** Hand shown to everyone (showdown, open games). */
  revealed?: CardId[];
  chips: Text[];
  /** No longer in the match or round. */
  out?: boolean;
  /** Cards lying in front of the seat (Golf grid, Cabo cards, a hand to draw from blind). */
  slots?: SlotCard[];
  /** Grid width of `slots`; one row when unset. */
  slotColumns?: number;
}

export interface PileCard {
  id: CardId;
  /** Card lying on top of it (a beaten attack). */
  cover?: CardId;
  /** Seat that played it. */
  seat?: number;
}

export interface PileView {
  id: string;
  /** `row`: open cards; `stock`: face-down stack with `count` and optional open cards under it. */
  kind: 'row' | 'stock';
  label?: Text;
  cards: PileCard[];
  count?: number;
}

export interface ActionView {
  id: string;
  arg?: string | number;
  label: Text;
  tone?: 'primary' | 'danger';
}

export interface SummaryRow {
  seat: number;
  cards?: CardId[];
  value: Text;
  note?: Text;
  tone?: 'good' | 'bad';
}

export interface RoundSummary {
  title: Text;
  lines: Text[];
  rows: SummaryRow[];
}

export interface ScriptView {
  status: Text;
  info: Text[];
  seats: SeatView[];
  /** Seats that have to act now (empty between rounds). */
  active: number[];
  piles: PileView[];
  /** The viewer's hand, sorted for display. */
  hand: CardId[];
  /** How many hand cards the viewer may pick for a move. */
  select: 'none' | 'one' | 'many';
  /** Table cards the viewer may pick as the target of a move. */
  targets: CardId[];
  /** Slots the viewer may tap (`{ kind: 'slot' }` moves). */
  slotTargets: SlotRef[];
  actions: ActionView[];
  /** Label of the button that plays the picked cards. */
  playLabel?: Text;
  summary?: RoundSummary;
}

/**
 * A table setting of a game (house rule, aid): a switch in the setup and in the settings dialog
 * of a running game. Off unless `default` is set.
 */
export interface ScriptOption {
  id: string;
  /** i18n key under `games.tabletop.scripted`. */
  label: string;
  hint?: string;
  default?: boolean;
}

/** Chosen options by id; a missing id takes the option's default. */
export type ScriptOptions = Readonly<Record<string, boolean>>;

/** Whether option `id` is on: the choice, else the declared default. */
export function optionOn(
  declared: readonly ScriptOption[] | undefined,
  chosen: ScriptOptions | undefined,
  id: string,
): boolean {
  const value = chosen?.[id];
  if (typeof value === 'boolean') return value;
  return declared?.find((o) => o.id === id)?.default === true;
}

/** Every declared option with its value (choice or default); unknown ids are dropped. */
export function resolveOptions(
  declared: readonly ScriptOption[] | undefined,
  chosen?: ScriptOptions,
): ScriptOptions {
  return Object.fromEntries((declared ?? []).map((o) => [o.id, optionOn(declared, chosen, o.id)]));
}

export interface GameScript<G> {
  id: string;
  minPlayers: number;
  maxPlayers: number;
  /** Every rank the game can deal (all four suits), for exporting its deck. */
  ranks: readonly string[];
  /** Cards of that deck the game leaves out. */
  removed?: readonly CardId[];
  /** Jokers in the deck. */
  jokers?: number;
  options?: readonly ScriptOption[];
  /**
   * The running match with changed table settings (the host changed them mid-game); the new
   * rules apply from the next move. Without it a change applies from the next match.
   */
  configure?(state: G, options: ScriptOptions): G;
  /** A new match with a first deal. */
  start(playerCount: number, rng: Rng, options?: ScriptOptions): G;
  /** The state after `seat`'s move; the same object when the move is not allowed. */
  move(state: G, seat: number, move: ScriptMove, rng: Rng): G;
  /** What `viewer` sees (`null`: a spectator). */
  view(state: G, viewer: number | null): ScriptView;
}

/** A script with its state type erased, as the registry and the session keep it. */
export type AnyGameScript = GameScript<unknown>;

export const eraseScript = <G>(script: GameScript<G>): AnyGameScript =>
  script as unknown as AnyGameScript;

export const msg = (key: string, params?: Msg['params'], seat?: number): Msg => ({
  key,
  ...(params ? { params } : {}),
  ...(seat === undefined ? {} : { seat }),
});

/** Buttons and selection only for a seat that is to act. */
export function emptyView(seatCount: number): ScriptView {
  return {
    status: '',
    info: [],
    seats: Array.from({ length: seatCount }, () => ({ cards: 0, chips: [] })),
    active: [],
    piles: [],
    hand: [],
    select: 'none',
    targets: [],
    slotTargets: [],
    actions: [],
  };
}
