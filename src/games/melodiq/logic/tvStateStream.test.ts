import { describe, expect, it } from 'vitest';
import type { SungSegment } from '../gameplay/PitchVisualizer';
import type { PassivePlayerState } from '../types';
import {
  applySungSegments,
  createSegmentDeltaEncoder,
  createTvStateStream,
  shouldRenderTvState,
  TV_KEYFRAME_MS,
  TV_RENDER_REFRESH_MS,
} from './tvStateStream';

const seg = (noteIndex: number, startBeat: number, endBeat: number): SungSegment =>
  ({ noteIndex, startBeat, endBeat, trackIndex: 0 }) as SungSegment;

const player = (sungSegments: Record<number, SungSegment[]>): PassivePlayerState => ({
  id: 'p1',
  name: 'P1',
  hue: 0,
  score: 0,
  trackScores: {},
  currentPitch: null,
  activeSegments: {},
  sungSegments,
  combo: 0,
  lastHit: null,
});

describe('createSegmentDeltaEncoder', () => {
  it('sends everything first, then only changed notes, then a keyframe', () => {
    const enc = createSegmentDeltaEncoder();
    const segments: Record<number, SungSegment[]> = { 0: [seg(0, 0, 1)], 1: [seg(1, 2, 3)] };

    const first = enc.encode({ players: [player(segments)] }, 0).players![0];
    expect(Object.keys(first.sungSegments!)).toEqual(['0', '1']);
    expect(first.sungSegmentsDelta).toBe(false);

    const unchanged = enc.encode({ players: [player(segments)] }, 33).players![0];
    expect(unchanged.sungSegments).toEqual({});
    expect(unchanged.sungSegmentsDelta).toBe(true);

    segments[1][0].endBeat = 4; // the running segment grows
    segments[2] = [seg(2, 5, 5)];
    const delta = enc.encode({ players: [player(segments)] }, 66).players![0];
    expect(Object.keys(delta.sungSegments!)).toEqual(['1', '2']);

    const key = enc.encode({ players: [player(segments)] }, TV_KEYFRAME_MS).players![0];
    expect(Object.keys(key.sungSegments!)).toEqual(['0', '1', '2']);
    expect(key.sungSegmentsDelta).toBe(false);
  });

  it('sends a player in full after a reset or when its notes shrink (new song)', () => {
    const enc = createSegmentDeltaEncoder();
    enc.encode({ players: [player({ 0: [seg(0, 0, 1)], 1: [seg(1, 2, 3)] })] }, 0);
    const shrunk = enc.encode({ players: [player({ 0: [seg(0, 0, 1)] })] }, 33).players![0];
    expect(shrunk.sungSegmentsDelta).toBe(false);
    expect(Object.keys(shrunk.sungSegments!)).toEqual(['0']);

    enc.reset();
    const afterReset = enc.encode({ players: [player({ 0: [seg(0, 0, 1)] })] }, 66).players![0];
    expect(afterReset.sungSegmentsDelta).toBe(false);
  });

  it('does not change the input state', () => {
    const enc = createSegmentDeltaEncoder();
    const state = { players: [player({ 0: [seg(0, 0, 1)] })] };
    enc.encode(state, 0);
    enc.encode(state, 10);
    expect(Object.keys(state.players[0].sungSegments!)).toEqual(['0']);
    expect(state.players[0].sungSegmentsDelta).toBeUndefined();
  });

  it('round-trips through applySungSegments', () => {
    const enc = createSegmentDeltaEncoder();
    const segments: Record<number, SungSegment[]> = { 0: [seg(0, 0, 1)] };
    let tv: Record<number, SungSegment[]> | null = null;
    const step = (now: number) => {
      const p = enc.encode({ players: [player(segments)] }, now).players![0];
      tv = applySungSegments(tv, p.sungSegments!, p.sungSegmentsDelta);
    };
    step(0);
    segments[1] = [seg(1, 2, 3)];
    step(33);
    segments[1].push(seg(1, 3.5, 4));
    step(66);
    expect(tv).toEqual(segments);
  });
});

describe('shouldRenderTvState', () => {
  const base = { isPlaying: true, activeSongId: 's', currentTime: 1, players: [player({})] };

  it('skips renders for clock-only changes', () => {
    expect(shouldRenderTvState(base, { ...base, currentTime: 1.03 }, 33)).toBe(false);
  });

  it('renders on visible changes, new singers, the first state and the refresh interval', () => {
    expect(shouldRenderTvState(null, base, 0)).toBe(true);
    expect(shouldRenderTvState(base, { ...base, isPlaying: false }, 33)).toBe(true);
    expect(shouldRenderTvState(base, { ...base, lyricsPosition: 'center' }, 33)).toBe(true);
    expect(shouldRenderTvState(base, { ...base, players: [] }, 33)).toBe(true);
    expect(shouldRenderTvState(base, { ...base, currentTime: 2 }, TV_RENDER_REFRESH_MS)).toBe(true);
  });
});

describe('createTvStateStream', () => {
  it('throttles to the interval but never drops a play/stop change', () => {
    const stream = createTvStateStream(33);
    expect(stream.next({ isPlaying: true }, 0)).not.toBeNull();
    expect(stream.next({ isPlaying: true }, 10)).toBeNull();
    expect(stream.next({ isPlaying: false }, 12)).not.toBeNull();
    expect(stream.next({ isPlaying: false }, 20)).toBeNull();
    expect(stream.next({ isPlaying: false }, 50)).not.toBeNull();
  });
});
