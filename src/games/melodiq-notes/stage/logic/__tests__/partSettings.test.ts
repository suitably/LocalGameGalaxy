import { describe, expect, it } from 'vitest';
import { song } from '../../engine/__tests__/fixtures';
import { buildBandEvents, defaultSeats, nextSeat } from '../../engine/players';
import { pultSongOf } from '../../../pult/logic/pultSong';
import {
  canHide,
  hiddenCount,
  keptSeats,
  stageView,
  updatePartSettings,
  type ScorePartSettings,
} from '../partSettings';

const notesOf = (events: ReturnType<typeof buildBandEvents>) =>
  events.filter((e) => e.kind !== 'click').length;

describe('stageView (#564)', () => {
  it('is the song itself without settings', () => {
    const s = song();
    const view = stageView(s, {});
    expect(view.song).toBe(s);
    expect(view.backing).toEqual([]);
  });

  it('leaves hidden parts out of seats, the pult list and the part count', () => {
    const view = stageView(song(), { piano: { hidden: true } });
    expect(view.song.parts.map((p) => p.id)).toEqual(['bass', 'drums']);
    expect(defaultSeats(view.song)[0].partId).not.toBe('piano');
    expect(nextSeat(view.song, [{ partId: 'bass', inst: 'bass' }])?.partId).toBe('drums');
    expect(pultSongOf(view.song).parts.map((p) => p.id)).toEqual(['bass', 'drums']);
  });

  it('mutes a hidden part by default and lets the synth play it when chosen', () => {
    const seats = [{ partId: 'bass', inst: 'bass' as const }];
    const muted = stageView(song(), { piano: { hidden: true } });
    expect(notesOf(buildBandEvents(muted.song, seats, 'all', 0))).toBe(4 + 4);
    const synth = stageView(song(), { piano: { hidden: true, playback: 'synth' } });
    expect(synth.backing.map((p) => p.id)).toEqual(['piano']);
    expect(notesOf(buildBandEvents(synth.song, seats, 'others', 0))).toBe(16 + 4);
    expect(notesOf(buildBandEvents(synth.song, seats, 'none', 0))).toBe(0);
  });

  it('renames parts and never hides every part with notes', () => {
    const renamed = stageView(song(), { bass: { name: 'Low end' } });
    expect(renamed.song.parts.find((p) => p.id === 'bass')?.name).toBe('Low end');
    const all: ScorePartSettings = {
      piano: { hidden: true },
      bass: { hidden: true },
      drums: { hidden: true },
    };
    expect(stageView(song(), all).song.parts).toHaveLength(3);
    expect(hiddenCount(song(), all)).toBe(3);
  });
});

describe('part settings edits (#564)', () => {
  const piano = song().parts[0];

  it('keeps only what differs from the default', () => {
    let s = updatePartSettings({}, piano, { hidden: true });
    expect(s).toEqual({ piano: { hidden: true } });
    s = updatePartSettings(s, piano, { playback: 'synth', name: ' Keys ' });
    expect(s).toEqual({ piano: { hidden: true, playback: 'synth', name: 'Keys' } });
    s = updatePartSettings(s, piano, { hidden: false });
    expect(s).toEqual({ piano: { name: 'Keys' } });
    expect(updatePartSettings(s, piano, { name: 'Piano' })).toEqual({});
  });

  it('allows hiding only while another part with notes stays visible', () => {
    expect(canHide(song(), {}, 'piano')).toBe(true);
    expect(canHide(song(), { bass: { hidden: true }, drums: { hidden: true } }, 'piano')).toBe(
      false,
    );
  });

  it('keeps the seats whose part is still visible', () => {
    const view = stageView(song(), { piano: { hidden: true } }).song;
    expect(keptSeats([{ partId: 'piano', inst: 'keyboard' }], view)).toBeNull();
    expect(
      keptSeats(
        [
          { partId: 'piano', inst: 'keyboard' },
          { partId: 'bass', inst: 'bass' },
        ],
        view,
      ),
    ).toEqual([{ partId: 'bass', inst: 'bass' }]);
  });
});
