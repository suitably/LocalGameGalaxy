import { describe, expect, it } from 'vitest';
import { buildBandEvents, createPlayers } from '../players';
import { song } from './fixtures';

describe('drum lanes in the engine (#571)', () => {
  it('display-only percussion still sounds with the band, judged percussion does not (#571)', () => {
    const s = song();
    const drums = s.parts.find((p) => p.id === 'drums')!;
    drums.notes = [
      { t: 0, dur: 0.25, pitch: 36 },
      { t: 1, dur: 0.25, pitch: 54 },
    ];
    const seats = [{ partId: 'drums', inst: 'drums' as const }];
    const drumLanes = (judgePercussion: boolean) =>
      buildBandEvents(s, seats, 'others', 0, 0, { judgePercussion, mergeToms: false })
        .filter((ev) => ev.kind === 'drum')
        .map((ev) => ev.lane);
    expect(drumLanes(false)).toEqual([7]);
    expect(drumLanes(true)).toEqual([]);
    const [p] = createPlayers(s, seats, 1, 0, { judgePercussion: false, mergeToms: false });
    expect(p.notes.map((n) => n.lane)).toEqual([8]);
    expect(p.drumKit?.shown.map((n) => n.drum)).toEqual(['tambourine']);
    // a pult seat never judges percussion and has one tom pad
    const [remote] = createPlayers(s, [{ ...seats[0], remoteId: 'a' }], 1, 0, {
      judgePercussion: true,
      mergeToms: false,
    });
    expect(remote.drumKit?.mergeToms).toBe(true);
    expect(remote.notes.map((n) => n.lane)).toEqual([8]);
  });
});
