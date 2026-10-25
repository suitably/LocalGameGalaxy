/**
 * Stage ↔ Pult protocol for Melodiq Notes [ID: GAME-MELODIQ-NOTES-PULT-PROTOCOL]
 *
 * The stage (TV / laptop) owns the clock, the score and the judging. Every player's own device
 * (the "Pult") joins with a part and an instrument, measures its clock offset to the stage with
 * ping/pong and sends what its player plays, stamped with the estimated stage time.
 *
 * Two kinds of traffic, both over `modules/room-game`:
 * - room state (`PultRoomState`, host-run reducer): who plays which part, the song, play state;
 * - live events (`PultEvent`, fire-and-forget): ping/pong and played input.
 */
import type { InstrumentKind } from '../../../../modules/music-score';
import type { PlayState } from '../../stage/engine/types';

/** A part of the stage's song as a pult can pick it. */
export interface PultPart {
  id: string;
  name: string;
  inst: InstrumentKind;
  /** C of the octave the computer keyboard plays on a keys view. */
  octaveBase: number;
}

/** One pult in the room and the part it plays. */
export interface PultMember {
  id: string;
  name: string;
  partId: string;
  inst: InstrumentKind;
}

export interface PultSong {
  title: string;
  parts: PultPart[];
}

export interface PultRoomState {
  /** Player id of the stage; only it may change song and play state. */
  hostId: string;
  song: PultSong | null;
  play: PlayState;
  members: PultMember[];
}

export type PultRoomAction =
  | { type: 'JOIN'; member: PultMember }
  | { type: 'LEAVE'; id: string }
  | { type: 'STAGE'; song: PultSong | null; play: PlayState };

/** What a player did on their pult: a lane (key, string, drum lane), a pitch (MIDI / mic) or their voice. */
export type PultInput =
  | { kind: 'lane'; lane: number }
  | { kind: 'pitch'; pitch: number }
  | { kind: 'voice'; pitch: number | null };

export type PultEvent =
  | { kind: 'ping'; from: string; id: number; t0: number }
  | { kind: 'pong'; from: string; to: string; id: number; t0: number; ts: number }
  /** `at`: when it was played, in stage clock milliseconds (see clockSync). */
  | { kind: 'input'; from: string; input: PultInput; at: number };

export const PULT_MAX_MEMBERS = 4;
export const PULT_GAME_KEY = 'melodiq-notes-pult';

export const initialPultRoom = (hostId: string): PultRoomState => ({
  hostId,
  song: null,
  play: 'idle',
  members: [],
});

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Host-run reducer; returns the same object when nothing changes. */
export function pultRoomReducer(state: PultRoomState, action: PultRoomAction): PultRoomState {
  switch (action.type) {
    case 'JOIN': {
      const m = action.member;
      if (!state.song?.parts.some((p) => p.id === m.partId)) return state;
      const others = state.members.filter((x) => x.id !== m.id);
      // a part is played by one pult; the first one keeps it
      if (others.some((x) => x.partId === m.partId) || others.length >= PULT_MAX_MEMBERS)
        return state;
      const old = state.members.find((x) => x.id === m.id);
      if (old && same(old, m)) return state;
      return { ...state, members: [...others, m] };
    }
    case 'LEAVE':
      return state.members.some((x) => x.id === action.id)
        ? { ...state, members: state.members.filter((x) => x.id !== action.id) }
        : state;
    case 'STAGE': {
      if (state.play === action.play && same(state.song, action.song)) return state;
      const parts = new Set(action.song?.parts.map((p) => p.id) ?? []);
      const members = state.members.filter((m) => parts.has(m.partId));
      return { ...state, song: action.song, play: action.play, members };
    }
  }
}

/** A pult may only join or leave as itself; song and play state belong to the stage. */
export function pultRoomAllows(state: PultRoomState, action: PultRoomAction, from: string) {
  if (action.type === 'JOIN') return action.member.id === from;
  if (action.type === 'LEAVE') return action.id === from || from === state.hostId;
  return from === state.hostId;
}

/** A free part for a pult: the wanted one if nobody else has it, else the first free one. */
export function freePart(
  state: PultRoomState,
  me: string,
  wanted?: string | null,
): PultPart | null {
  const taken = new Set(state.members.filter((m) => m.id !== me).map((m) => m.partId));
  const parts = state.song?.parts.filter((p) => !taken.has(p.id)) ?? [];
  return parts.find((p) => p.id === wanted) ?? parts[0] ?? null;
}
