/**
 * What the host tells each seat of a scripted game [ID: LOGIC-TABLETOP-SCRIPT-VIEWS]
 *
 * The host keeps the whole `SessionState`; a device only gets `script.view(state, seat)` for its
 * own seat (plus the public player list and step). Whether a pick is playable is decided on the
 * host: the view carries `hints` for single-card picks, bigger picks are tried optimistically and
 * the host refuses illegal ones (`sessionAllows` + the script's `move`).
 */
import type { ScriptMove, ScriptOptions, ScriptView } from './scriptTypes';
import { moveAllowed, sessionView, type SessionPlayer, type SessionState } from './session';

/** One seat's (or the table's) picture of the game. */
export interface SeatPacket {
  players: SessionPlayer[];
  step: number;
  /** `null` until a game runs. */
  view: ScriptView | null;
  /** Single-card moves the script accepts now: `card` or `card>target`. */
  hints: string[];
  /** Table settings of the running match, shown read-only on the guests. */
  options?: ScriptOptions;
}

const hintKey = (card: string, target?: string) => (target ? `${card}>${target}` : card);

/** Playable single-card picks of `seat`, found by trying them on the host. */
function singleCardHints(state: SessionState, seat: number, view: ScriptView): string[] {
  if (view.select !== 'one') return [];
  const out: string[] = [];
  for (const card of view.hand) {
    if (view.targets.length === 0) {
      if (moveAllowed(state, seat, { kind: 'cards', cards: [card] })) out.push(hintKey(card));
    } else {
      for (const target of view.targets) {
        if (moveAllowed(state, seat, { kind: 'cards', cards: [card], target })) {
          out.push(hintKey(card, target));
        }
      }
    }
  }
  return out;
}

/** The packet for `viewer` (`null`: the public table). Pure; the host calls it per seat. */
export function seatPacket(state: SessionState, viewer: number | null): SeatPacket {
  const view = sessionView(state, viewer);
  const hints = view && viewer !== null ? singleCardHints(state, viewer, view) : [];
  return {
    players: state.players,
    step: state.step,
    view,
    hints,
    ...(state.options ? { options: state.options } : {}),
  };
}

/** The `allowed` check of a device that only holds its packet. */
export function allowedFromPacket(packet: SeatPacket): (move: ScriptMove) => boolean {
  const known = new Set(packet.hints);
  const single = packet.view?.select === 'one';
  return (move) => {
    if (move.kind !== 'cards' || !single || move.cards.length !== 1) return true;
    return known.has(hintKey(move.cards[0], move.target));
  };
}
