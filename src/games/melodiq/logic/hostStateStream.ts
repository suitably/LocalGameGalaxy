import type { SungSegment } from '../gameplay/PitchVisualizer';
import type { PassiveGameState, PassivePlayerState } from '../types';

/**
 * Host game state streams to the TV and the phones [ID: LOGIC-MELODIQ-TV-STREAM]
 *
 * The host sends its game state to the TV (~30/s) and the phones (~20/s), each through a
 * `createStateStream`. Two things keep that cheap:
 * - `createSegmentDeltaEncoder`: a player's sung segments grow over the whole song; sending them
 *   in full every time made each message bigger and the TV slower towards the end. Only notes
 *   whose segments changed are sent, plus a full keyframe every `TV_KEYFRAME_MS` (a TV or phone
 *   that connects or reloads mid-song is complete again within that time).
 * - `shouldRenderTvState`: the TV re-renders the session only when something visible in React
 *   changes; the fast data (clock, pitch, scores, segments) reaches `usePassiveSync` through the
 *   window event and refs.
 */

export const TV_KEYFRAME_MS = 2000;
/** The TV re-renders at least this often, so slow-moving values (e.g. resume time) stay fresh. */
export const TV_RENDER_REFRESH_MS = 1000;

type Segments = Record<number, SungSegment[]>;

const signature = (list: SungSegment[]): string => {
  const last = list[list.length - 1];
  return last ? `${list.length}:${last.startBeat}:${last.endBeat}` : '0';
};

export interface SegmentDeltaEncoder {
  /** Returns a copy of `state` whose players carry only changed segments (or all, on a keyframe). */
  encode<T extends Partial<PassiveGameState>>(state: T, now: number): T;
}

export function createSegmentDeltaEncoder(keyframeMs = TV_KEYFRAME_MS): SegmentDeltaEncoder {
  // player id → note index → signature of what the TV has
  let sent = new Map<string, Map<string, string>>();
  let lastKeyframe = -Infinity;

  const encodePlayer = (player: PassivePlayerState, keyframe: boolean): PassivePlayerState => {
    const segments = player.sungSegments;
    if (!segments) return player;
    const entries = Object.entries(segments);
    let known = sent.get(player.id);
    // Fewer notes than the TV knows: a new song or a reset; send this player in full
    const full = keyframe || !known || entries.length < known.size;
    if (full || !known) {
      known = new Map();
      sent.set(player.id, known);
    }
    const changed: Segments = {};
    for (const [note, list] of entries) {
      const sig = signature(list);
      if (full || known.get(note) !== sig) {
        known.set(note, sig);
        changed[Number(note)] = list;
      }
    }
    return { ...player, sungSegments: changed, sungSegmentsDelta: !full };
  };

  return {
    encode(state, now) {
      if (!state.players || state.players.length === 0) return state;
      const keyframe = now - lastKeyframe >= keyframeMs;
      if (keyframe) {
        lastKeyframe = now;
        sent = new Map();
      }
      return { ...state, players: state.players.map((p) => encodePlayer(p, keyframe)) };
    },
  };
}

/** Shortest time between two game states to the TV (~30/s; it interpolates the host clock). */
export const TV_STATE_INTERVAL_MS = 33;
/** Shortest time between two game states to the phones (~20/s). */
export const PHONE_STATE_INTERVAL_MS = 50;

export interface StateStream {
  /**
   * The state to send now, or null when throttled away; `build` runs only when one is sent, and
   * a play/stop change is never dropped. Sung segments are encoded as deltas.
   */
  next<T extends Partial<PassiveGameState>>(
    isPlaying: boolean | undefined,
    now: number,
    build: () => T,
  ): T | null;
}

/** One throttled, delta-encoded output of the host's game state (TV or phones). */
export function createStateStream(intervalMs: number): StateStream {
  const encoder = createSegmentDeltaEncoder();
  let lastSent = -Infinity;
  let lastPlaying: boolean | undefined;
  return {
    next(isPlaying, now, build) {
      if (isPlaying === lastPlaying && now - lastSent < intervalMs) return null;
      lastPlaying = isPlaying;
      lastSent = now;
      return encoder.encode(build(), now);
    },
  };
}

/** Applies received segments to the TV's copy: merged into it for a delta, replacing it otherwise. */
export function applySungSegments(
  current: Segments | null | undefined,
  incoming: Segments,
  isDelta: boolean | undefined,
): Segments {
  if (!isDelta || !current) return incoming;
  return Object.assign(current, incoming);
}

type RenderKeys = Pick<
  PassiveGameState,
  | 'isPlaying'
  | 'isFinished'
  | 'isPausedForScore'
  | 'activeSongId'
  | 'lyricsScale'
  | 'enableLyricsZoom'
  | 'lyricsLines'
  | 'lyricsPosition'
  | 'youTubeConsent'
>;
const RENDER_KEYS: (keyof RenderKeys)[] = [
  'isPlaying',
  'isFinished',
  'isPausedForScore',
  'activeSongId',
  'lyricsScale',
  'enableLyricsZoom',
  'lyricsLines',
  'lyricsPosition',
  'youTubeConsent',
];

const playerIds = (state: Partial<PassiveGameState>) =>
  (state.players ?? []).map((p) => p.id).join(',');

/**
 * Whether the TV must hand `next` to React (re-render): on the first state, when a value React
 * shows changes, when the singers change, or after `TV_RENDER_REFRESH_MS` without a render.
 */
export function shouldRenderTvState(
  previous: Partial<PassiveGameState> | null,
  next: Partial<PassiveGameState>,
  msSinceRender: number,
): boolean {
  if (!previous) return true;
  if (msSinceRender >= TV_RENDER_REFRESH_MS) return true;
  if (RENDER_KEYS.some((key) => previous[key] !== next[key])) return true;
  return playerIds(previous) !== playerIds(next);
}
