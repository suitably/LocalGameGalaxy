import { describe, expect, it } from 'vitest';
import type { ScoreSong } from '../../../../../modules/music-score';
import { buildChart, type Judgement, type StageNote } from '../../../stage/logic/charts';
import { createPlayers } from '../../../stage/engine/players';
import {
  addSample,
  clampLatency,
  clockSample,
  CLOCK_SAMPLES_KEPT,
  estimateOffset,
  MAX_INPUT_LATENCY_MS,
  toStageTime,
} from '../clockSync';
import {
  freePart,
  initialPultRoom,
  pultRoomAllows,
  pultRoomReducer,
  type PultMember,
  type PultRoomState,
  type PultSong,
  type StageClock,
} from '../protocol';
import { packChart, pultJoinUrl, pultSongOf, songKeyOf, unpackChart } from '../pultSong';
import { applyJudged, mergeRemoteSeats } from '../remoteHits';
import { followBeat, stageBeatAt } from '../stageClock';

const SONG: PultSong = {
  key: 'k',
  title: 'T',
  parts: [
    { id: 'piano', name: 'Piano', inst: 'keyboard', octaveBase: 60 },
    { id: 'bass', name: 'Bass', inst: 'bass', octaveBase: 36 },
  ],
};
const member = (id: string, partId = 'piano'): PultMember => ({
  id,
  name: id,
  partId,
  inst: partId === 'bass' ? 'bass' : 'keyboard',
});
const withSong = (): PultRoomState =>
  pultRoomReducer(initialPultRoom('stage'), { type: 'STAGE', song: SONG, play: 'idle' });

describe('pult room reducer', () => {
  it('lets a pult join on a free part and keeps a part for its first player', () => {
    const a = pultRoomReducer(withSong(), { type: 'JOIN', member: member('a') });
    expect(a.members).toEqual([member('a')]);
    expect(pultRoomReducer(a, { type: 'JOIN', member: member('b') })).toBe(a);
    const moved = pultRoomReducer(a, { type: 'JOIN', member: member('a', 'bass') });
    expect(moved.members.map((m) => m.partId)).toEqual(['bass']);
  });

  it('ignores parts the song does not have and unchanged joins', () => {
    const s = withSong();
    expect(pultRoomReducer(s, { type: 'JOIN', member: member('a', 'flute') })).toBe(s);
    const a = pultRoomReducer(s, { type: 'JOIN', member: member('a') });
    expect(pultRoomReducer(a, { type: 'JOIN', member: member('a') })).toBe(a);
  });

  it('drops pults whose part the new song lacks', () => {
    const a = pultRoomReducer(withSong(), { type: 'JOIN', member: member('a', 'bass') });
    const next = pultRoomReducer(a, {
      type: 'STAGE',
      song: { key: 'u', title: 'U', parts: [SONG.parts[0]] },
      play: 'idle',
    });
    expect(next.members).toEqual([]);
    expect(pultRoomReducer(next, { type: 'LEAVE', id: 'a' })).toBe(next);
  });

  it('allows joining only as oneself and stage changes only from the stage', () => {
    const s = withSong();
    expect(pultRoomAllows(s, { type: 'JOIN', member: member('a') }, 'a')).toBe(true);
    expect(pultRoomAllows(s, { type: 'JOIN', member: member('a') }, 'b')).toBe(false);
    expect(pultRoomAllows(s, { type: 'LEAVE', id: 'a' }, 'stage')).toBe(true);
    expect(pultRoomAllows(s, { type: 'STAGE', song: null, play: 'idle' }, 'a')).toBe(false);
    expect(pultRoomAllows(s, { type: 'STAGE', song: null, play: 'idle' }, 'stage')).toBe(true);
  });

  it('offers the wanted part when free, else the first free one', () => {
    const a = pultRoomReducer(withSong(), { type: 'JOIN', member: member('a') });
    expect(freePart(a, 'b', 'piano')?.id).toBe('bass');
    expect(freePart(a, 'a', 'piano')?.id).toBe('piano');
    expect(freePart(initialPultRoom('stage'), 'b')).toBeNull();
  });
});

describe('clock sync', () => {
  it('estimates the offset from the round trip with the shortest delay', () => {
    // stage clock is 1000 ms ahead; one sample was delayed one way only
    const good = clockSample(0, 1010, 20)!;
    expect(good).toEqual({ offset: 1000, rtt: 20 });
    let samples = [good];
    samples = addSample(samples, clockSample(100, 1110, 120)!);
    samples = addSample(samples, clockSample(200, 1250, 600)!);
    samples = addSample(samples, clockSample(700, 1712, 724)!);
    expect(estimateOffset(samples)?.offset).toBe(1000);
    expect(estimateOffset([])).toBeNull();
    expect(clockSample(10, 0, 5)).toBeNull();
    expect(toStageTime(50, 1000, 20)).toBe(1030);
  });

  it('keeps a calibrated latency within bounds', () => {
    expect(clampLatency(150.4)).toBe(150);
    expect(clampLatency(-20)).toBe(0);
    expect(clampLatency(MAX_INPUT_LATENCY_MS + 50)).toBe(MAX_INPUT_LATENCY_MS);
    expect(clampLatency(Number.NaN)).toBe(0);
  });

  it('keeps only the latest samples', () => {
    let samples = [clockSample(0, 0, 1)!];
    for (let i = 0; i < 20; i++) samples = addSample(samples, clockSample(i, i, i + 2)!);
    expect(samples.length).toBe(CLOCK_SAMPLES_KEPT);
  });
});

const CLOCK: StageClock = {
  songKey: 'k',
  at: 1000,
  beat: 4,
  startBeat: 0,
  rate: 2,
  play: 'playing',
  mode: 'perform',
  loop: null,
};

describe('stage clock on a pult', () => {
  it('extrapolates the beat while playing and holds it otherwise', () => {
    expect(stageBeatAt(CLOCK, 1500)).toBe(5);
    expect(stageBeatAt({ ...CLOCK, play: 'paused' }, 1500)).toBe(4);
    // learn mode waiting for a player on the stage: rate 0
    expect(stageBeatAt({ ...CLOCK, rate: 0 }, 1500)).toBe(4);
  });

  it('pulls small differences in and jumps over big ones', () => {
    const near = followBeat(4, 4.05, 0.016, 2);
    expect(near).toBeGreaterThan(4.032);
    expect(near).toBeLessThan(4.05);
    expect(followBeat(4, 8, 0.016, 2)).toBe(8);
    expect(followBeat(4, 3, 0.016, 0)).toBe(3);
  });
});

describe('remote hits', () => {
  it('seats pults on their part, adds new seats and drops a seat whose pult left', () => {
    const seats = [{ partId: 'piano', inst: 'keyboard' as const }];
    const both = mergeRemoteSeats(seats, [member('a'), member('b', 'bass')], 4);
    expect(both).toEqual([
      { partId: 'piano', inst: 'keyboard', remoteId: 'a', name: 'a' },
      { partId: 'bass', inst: 'bass', remoteId: 'b', name: 'b' },
    ]);
    expect(mergeRemoteSeats(both, [member('b', 'bass')], 4)).toEqual([both[1]]);
    expect(mergeRemoteSeats(both, [], 4)).toEqual([{ partId: 'piano', inst: 'keyboard' }]);
    expect(mergeRemoteSeats(seats, [member('b', 'bass')], 1)).toEqual(seats);
  });
  it('merges a pult batch once per note and takes over its totals', () => {
    const [p] = createPlayers(timeline(), [{ partId: 'p', inst: 'keyboard', remoteId: 'a' }], 1);
    const judged: number[] = [];
    const judge = (_: unknown, n: StageNote, kind: Judgement) => {
      n.judged = kind;
      judged.push(n.id);
    };
    const score = { score: 300, combo: 2, maxCombo: 2, judged: 2, weightSum: 2 };
    expect(
      applyJudged(
        p,
        [
          [0, 'perfect'],
          [0, 'perfect'],
          [9, 'good'],
        ],
        score,
        judge,
      ),
    ).toBe(1);
    expect(judged).toEqual([0]);
    expect(p.stats.score).toBe(300);
  });
});

function timeline(): ScoreSong {
  return {
    title: 'T',
    artist: '',
    source: 't',
    tempoMap: [{ beat: 0, bpm: 120 }],
    measureStarts: [0],
    measureLengths: [4],
    measureNumbers: [1],
    end: 4,
    parts: [
      {
        id: 'p',
        name: 'Piano',
        notes: [
          { t: 0, dur: 1, pitch: 64, syl: 'la-' },
          { t: 1, dur: 0.5, pitch: 62 },
          { t: 1, dur: 0.5, pitch: 60 },
        ],
        isDrum: false,
        program: 0,
        guess: 'keyboard',
      },
      {
        id: 'd',
        name: 'Drums',
        notes: [{ t: 0, dur: 0.25, pitch: 42, drum: 'hihatClosed', hand: 'R' }],
        isDrum: true,
        program: null,
        guess: 'drums',
      },
    ],
  };
}

describe('pult chart', () => {
  it('sends one part that rebuilds into the same chart on the pult', () => {
    const song = timeline();
    const chart = packChart(song, 'p')!;
    expect(chart.songKey).toBe(songKeyOf(song));
    const back = unpackChart(JSON.parse(JSON.stringify(chart)));
    expect(back.parts.map((p) => p.id)).toEqual(['p']);
    expect(back.end).toBe(4);
    expect(buildChart(back.parts[0], 'keyboard')).toEqual(buildChart(song.parts[0], 'keyboard'));
    const drums = unpackChart(JSON.parse(JSON.stringify(packChart(song, 'd'))));
    expect(drums.parts[0].notes).toEqual(song.parts[1].notes);
    expect(packChart(song, 'x')).toBeNull();
  });

  it('gives a changed song a new key', () => {
    const a = timeline();
    const b = timeline();
    b.parts[0].notes[1].pitch = 63;
    expect(songKeyOf(a)).toBe(songKeyOf(timeline()));
    expect(songKeyOf(a)).not.toBe(songKeyOf(b));
  });
});

describe('pult song', () => {
  it('lists the playable parts with their keyboard octave and builds the join link', () => {
    const song = pultSongOf({
      title: 'T',
      artist: '',
      source: 't',
      tempoMap: [{ beat: 0, bpm: 120 }],
      measureStarts: [0],
      measureLengths: [4],
      measureNumbers: [1],
      end: 4,
      parts: [
        {
          id: 'p',
          name: 'Piano',
          notes: [{ t: 0, dur: 1, pitch: 64 }],
          isDrum: false,
          program: 0,
          guess: 'keyboard',
        },
        { id: 'e', name: 'Empty', notes: [], isDrum: false, program: 0, guess: 'guitar' },
      ],
    });
    expect(song.parts).toEqual([{ id: 'p', name: 'Piano', inst: 'keyboard', octaveBase: 60 }]);
    expect(pultJoinUrl('https://x/', 'AB12', 'p')).toBe(
      'https://x/#/games/melodiq-notes?pult=AB12&part=p',
    );
    expect(pultJoinUrl('https://x/', 'AB12', undefined, 'https://my.host:3000')).toBe(
      'https://x/#/games/melodiq-notes?pult=AB12&gameRelay=https%3A%2F%2Fmy.host%3A3000',
    );
  });
});
