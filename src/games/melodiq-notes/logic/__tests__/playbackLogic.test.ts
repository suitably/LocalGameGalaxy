import { describe, it, expect } from 'vitest';
import type { TargetNote } from '../../useNoteVerifier';
import type { ScorePartInfo } from '../../types';
import {
  computeEffectiveBpm,
  noteDurationSeconds,
  stepDurationSeconds,
  continuousStepDelayMs,
  waitModeAdvanceDelayMs,
} from '../playbackTiming';
import {
  applyChannelUpdate,
  pickDefaultPartId,
  selectAudibleEnsembleNotes,
  type EnsembleMixState,
} from '../ensembleMix';
import { resolveSongSource } from '../songSource';
import { DEMO_SONGS } from '../../demoSongs';

const part = (id: string, category: ScorePartInfo['category'] = 'piano'): ScorePartInfo => ({
  id,
  name: id,
  instrumentName: id,
  color: '#000',
  category,
});

describe('playbackTiming', () => {
  it('scales BPM by speed and clamps to a minimum', () => {
    expect(computeEffectiveBpm(120, 50)).toBe(60);
    expect(computeEffectiveBpm(30, 10)).toBe(20);
  });

  it('converts whole-note fractions to seconds', () => {
    expect(noteDurationSeconds(0.25, 60)).toBeCloseTo(1);
    expect(noteDurationSeconds(undefined, 120)).toBeCloseTo(0.5);
    expect(noteDurationSeconds(0.001, 120)).toBe(0.08);
  });

  it('uses stepDuration before note durations', () => {
    expect(
      stepDurationSeconds([{ pitch: 60, duration: 0.5, stepDuration: 0.125 }], 60),
    ).toBeCloseTo(0.5);
    expect(
      stepDurationSeconds(
        [
          { pitch: 60, duration: 0.5 },
          { pitch: 64, duration: 0.25 },
        ],
        60,
      ),
    ).toBeCloseTo(1);
    expect(stepDurationSeconds([], 120)).toBeCloseTo(0.5);
  });

  it('falls back to all cursor notes when the player part has no targets', () => {
    expect(continuousStepDelayMs([], [{ pitch: 60, stepDuration: 0.25 }], 60)).toBe(1000);
  });

  it('waits in wait mode until the note is hit', () => {
    const notes: TargetNote[] = [{ pitch: 60, stepDuration: 0.25 }];
    expect(waitModeAdvanceDelayMs(notes, false, 60)).toBeNull();
    expect(waitModeAdvanceDelayMs(notes, true, 60)).toBe(400);
    expect(
      waitModeAdvanceDelayMs([{ pitch: 0, isRest: true, stepDuration: 0.25 }], false, 60),
    ).toBe(1000);
    expect(
      waitModeAdvanceDelayMs(
        [{ pitch: 60, isTiedContinuation: true, stepDuration: 0.25 }],
        false,
        60,
      ),
    ).toBe(1000);
  });
});

describe('ensembleMix', () => {
  const baseMix: EnsembleMixState = {
    channels: {},
    playerPartId: 'P1',
    mutePlayerPart: false,
    masterVolume: 0.5,
    parts: [part('P1'), part('P2', 'bass')],
    bpm: 60,
  };
  const notes: TargetNote[] = [
    { pitch: 60, duration: 0.25, partId: 'P1' },
    { pitch: 40, duration: 0.25, partId: 'P2' },
    { pitch: 0, isRest: true, partId: 'P2' },
    { pitch: 62, isTiedContinuation: true, partId: 'P1' },
  ];

  it('plays every sounding note with master volume and part category', () => {
    const result = selectAudibleEnsembleNotes(notes, baseMix);
    expect(result.map((n) => n.midiPitch)).toEqual([60, 40]);
    expect(result[1]).toMatchObject({ category: 'bass', volume: 0.5, durationSeconds: 1 });
  });

  it('honours player mute, channel mute and solo', () => {
    expect(
      selectAudibleEnsembleNotes(notes, { ...baseMix, mutePlayerPart: true }).map((n) => n.partId),
    ).toEqual(['P2']);
    const muted = applyChannelUpdate({}, 'P2', { muted: true });
    expect(
      selectAudibleEnsembleNotes(notes, { ...baseMix, channels: muted }).map((n) => n.partId),
    ).toEqual(['P1']);
    const solo = applyChannelUpdate({}, 'P2', { solo: true, volume: 0.4 });
    expect(selectAudibleEnsembleNotes(notes, { ...baseMix, channels: solo })).toMatchObject([
      { partId: 'P2', volume: 0.2 },
    ]);
  });

  it('fills channel defaults on update', () => {
    expect(applyChannelUpdate({}, 'P3', { volume: 0.3 })).toEqual({
      P3: { partId: 'P3', volume: 0.3, muted: false, solo: false },
    });
  });

  it('prefers a guitar part as default', () => {
    expect(pickDefaultPartId([part('P1'), part('P2', 'guitar')])).toBe('P2');
    expect(pickDefaultPartId([part('P1')])).toBe('P1');
    expect(pickDefaultPartId([])).toBeUndefined();
  });
});

describe('resolveSongSource', () => {
  it('never mixes metadata or stems across sources', () => {
    const upload = resolveSongSource({
      kind: 'upload',
      xmlContent: '<x/>',
      title: 'Mine',
      artist: '',
      baseBpm: 90,
    });
    expect(upload).toEqual({
      xmlContent: '<x/>',
      title: 'Mine',
      artist: '',
      baseBpm: 90,
      syncOffsetMs: 0,
    });

    const demo = resolveSongSource({ kind: 'demo', song: DEMO_SONGS[0] });
    expect(demo.title).toBe(DEMO_SONGS[0].title);
    expect(demo.baseBpm).toBe(DEMO_SONGS[0].baseBpm ?? 100);
  });
});
