import { describe, expect, it } from 'vitest';
import { addSample, clockSample, estimateOffset, toStageTime } from '../clockSync';
import {
  freePart,
  initialPultRoom,
  pultRoomAllows,
  pultRoomReducer,
  type PultMember,
  type PultRoomState,
  type PultSong,
} from '../protocol';
import { beatBefore, MAX_REMOTE_LAG_SEC, mergeRemoteSeats, remoteLagSec } from '../remoteHits';

const SONG: PultSong = {
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
      song: { title: 'U', parts: [SONG.parts[0]] },
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

  it('keeps only the latest samples', () => {
    let samples = [clockSample(0, 0, 1)!];
    for (let i = 0; i < 20; i++) samples = addSample(samples, clockSample(i, i, i + 2)!);
    expect(samples.length).toBe(8);
  });
});

describe('remote hits', () => {
  it('measures how late input arrived and refuses stale input', () => {
    expect(remoteLagSec(1100, 1000)).toBeCloseTo(0.1);
    expect(remoteLagSec(1000, 1030)).toBe(0);
    expect(remoteLagSec(1000 + MAX_REMOTE_LAG_SEC * 1000 + 1, 1000)).toBeNull();
    expect(beatBefore(8, 0.25, 0.5)).toBe(7.5);
  });

  it('seats pults on their part, adds new seats and drops a seat whose pult left', () => {
    const seats = [{ partId: 'piano', inst: 'keyboard' as const }];
    const both = mergeRemoteSeats(seats, [member('a'), member('b', 'bass')], 4);
    expect(both).toEqual([
      { partId: 'piano', inst: 'keyboard', remoteId: 'a' },
      { partId: 'bass', inst: 'bass', remoteId: 'b' },
    ]);
    expect(mergeRemoteSeats(both, [member('b', 'bass')], 4)).toEqual([both[1]]);
    expect(mergeRemoteSeats(both, [], 4)).toEqual([{ partId: 'piano', inst: 'keyboard' }]);
    expect(mergeRemoteSeats(seats, [member('b', 'bass')], 1)).toEqual(seats);
  });
});
