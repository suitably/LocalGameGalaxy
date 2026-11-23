/**
 * Stage ↔ Pult protocol for Melodiq Notes [ID: GAME-MELODIQ-NOTES-PULT-PROTOCOL]
 *
 * The stage (TV / laptop) shows the game, owns the clock and the score and shows every player in
 * split screen. Every player's own device (the "Pult") joins with a part, measures its clock
 * offset to the stage with ping/pong, fetches the notes of its part (`chart`), follows the stage's
 * transport (`clock`) and judges its player's input locally. It sends the judgements and its score
 * (`judged`) and, for the stage's display only, what was played (`input`). Learn mode is for a
 * single player; when that player is on a pult, the stage waits for the pult's judgement.
 *
 * Two kinds of traffic, both over `modules/room-game`:
 * - room state (`PultRoomState`, host-run reducer): who plays which part, the song, play state and
 *   the song's leaderboard (`board`, the stage's stored best results, #699);
 * - live events (`PultEvent`, fire-and-forget): clock, charts, input, judgements, calibration.
 */
import type { InstrumentKind } from '../../../../modules/music-score';
import type { Judgement } from '../../stage/logic/charts';
import type { BeatRange } from '../../stage/logic/judging';
import type { PlayState, StageMode } from '../../stage/engine/types';
import type { PackedChart } from './pultSong';
import {
  leaderboard,
  toLeaderboardRow,
  type LeaderboardRow,
  type SongResult,
} from '../../stage/logic/songResults';

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
  /** Changes with every song the stage loads; stale charts and judgements carry an old one. */
  key: string;
  title: string;
  parts: PultPart[];
}

/** The stage's leaderboard of one song (#699): its best results, top `PULT_BOARD_ROWS` only. */
export interface PultBoard {
  songKey: string;
  rows: LeaderboardRow[];
}

export interface PultRoomState {
  /** Player id of the stage; only it may change song, play state and leaderboard. */
  hostId: string;
  song: PultSong | null;
  play: PlayState;
  members: PultMember[];
  /** Leaderboard of the song on stage; null before the stage sent one or after a song change. */
  board: PultBoard | null;
}

export type PultRoomAction =
  | { type: 'JOIN'; member: PultMember }
  | { type: 'LEAVE'; id: string }
  | { type: 'STAGE'; song: PultSong | null; play: PlayState }
  | { type: 'BOARD'; board: PultBoard };

/** What a player did on their pult, for the stage's display: a lane (key, string, drum lane) or their voice. */
export type PultInput = { kind: 'lane'; lane: number } | { kind: 'voice'; pitch: number | null };

/** The stage's transport at stage time `at` (ms): enough for a pult to run the same song clock. */
export interface StageClock {
  songKey: string;
  at: number;
  beat: number;
  /** First beat the stage plays (bars before its recording are left out). */
  startBeat: number;
  /** Beats per real second while playing (tempo, recording and speed included). */
  rate: number;
  play: PlayState;
  mode: StageMode;
  loop: BeatRange | null;
}

/** Totals of a pult's player; the stage shows these instead of counting itself. */
export interface PultScore {
  score: number;
  combo: number;
  maxCombo: number;
  judged: number;
  weightSum: number;
}

/** Judgements since the last batch: note id (in `buildChart` order) and result. */
export type JudgedMark = [noteId: number, kind: Judgement];

export type PultEvent =
  | { kind: 'ping'; from: string; id: number; t0: number }
  | { kind: 'pong'; from: string; to: string; id: number; t0: number; ts: number }
  | ({ kind: 'clock'; from: string } & StageClock)
  | { kind: 'chart-request'; from: string; songKey: string; partId: string }
  | { kind: 'chart'; from: string; to: string; chart: PackedChart }
  | { kind: 'input'; from: string; input: PultInput }
  /** `seq` grows with every batch of a pult, so a late batch cannot roll back its totals. */
  | {
      kind: 'judged';
      from: string;
      songKey: string;
      seq: number;
      marks: JudgedMark[];
      score: PultScore;
    }
  /** Tap-along calibration: the pult asks for clicks, the stage plays them at the stage times it names. */
  | { kind: 'click-request'; from: string; id: number }
  | { kind: 'click-plan'; from: string; to: string; id: number; times: number[] };

export const PULT_MAX_MEMBERS = 4;
/** Rows of the leaderboard the stage shares; keeps the room state small. */
export const PULT_BOARD_ROWS = 10;
export const PULT_GAME_KEY = 'melodiq-notes-pult';

export const initialPultRoom = (hostId: string): PultRoomState => ({
  hostId,
  song: null,
  play: 'idle',
  members: [],
  board: null,
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
      const board = state.board?.songKey === action.song?.key ? state.board : null;
      return { ...state, song: action.song, play: action.play, members, board };
    }
    case 'BOARD': {
      const board = parsePultBoard(action.board);
      if (!board || board.songKey !== state.song?.key || same(state.board, board)) return state;
      return { ...state, board };
    }
  }
}

/** The leaderboard the stage shares for a song: its best `PULT_BOARD_ROWS` results. */
export const pultBoardOf = (results: SongResult[], songKey: string): PultBoard => ({
  songKey,
  rows: leaderboard(results, songKey).slice(0, PULT_BOARD_ROWS).map(toLeaderboardRow),
});

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function isBoardRow(v: unknown): v is LeaderboardRow {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return (
    isNum(r.rank) &&
    (r.player === null || (typeof r.player === 'string' && r.player.length > 0)) &&
    isNum(r.seat) &&
    typeof r.inst === 'string' &&
    isNum(r.score)
  );
}

/** Checks a leaderboard that came over the network; drops it when malformed or too long. */
export function parsePultBoard(raw: unknown): PultBoard | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  if (typeof b.songKey !== 'string' || !Array.isArray(b.rows)) return null;
  if (b.rows.length > PULT_BOARD_ROWS || !b.rows.every(isBoardRow)) return null;
  return { songKey: b.songKey, rows: b.rows };
}

/** A pult may only join or leave as itself; song, play state and leaderboard belong to the stage. */
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
