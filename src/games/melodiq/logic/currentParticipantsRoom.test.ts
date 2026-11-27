import { describe, expect, it, vi } from 'vitest';
import {
  currentParticipantsAllows,
  currentParticipantsReducer,
  handleCurrentParticipantsEvent,
  INITIAL_CURRENT_PARTICIPANTS,
  parseCurrentParticipantsRequest,
  type CurrentParticipantsHostDeps,
} from './currentParticipantsRoom';
import { moveParticipant, toggleParticipant } from './queueParticipantUtils';

const peers: Record<string, { peerId: string; name: string; hue: number }> = {
  admin: { peerId: 'p-admin', name: 'Admin', hue: 10 },
  guest: { peerId: 'p-guest', name: 'Guest', hue: 20 },
};
const roles: Record<string, string> = { admin: 'admin', guest: 'singer' };

const deps = () => ({
  getRole: (id: string) => roles[id],
  getPeer: (id: string) => peers[id],
  toggle: vi.fn<CurrentParticipantsHostDeps['toggle']>(),
  reorder: vi.fn<CurrentParticipantsHostDeps['reorder']>(),
  onDenied: vi.fn<NonNullable<CurrentParticipantsHostDeps['onDenied']>>(),
});

describe('currentParticipantsRoom', () => {
  it('mirrors the host list and accepts it only from the host', () => {
    const list = [{ deviceId: 'a' }];
    const action = { type: 'HOST_CURRENT_PARTICIPANTS' as const, participants: list };
    expect(currentParticipantsReducer(INITIAL_CURRENT_PARTICIPANTS, action).participants).toBe(
      list,
    );
    const allows = currentParticipantsAllows('host');
    expect(allows(INITIAL_CURRENT_PARTICIPANTS, action, 'host')).toBe(true);
    expect(allows(INITIAL_CURRENT_PARTICIPANTS, action, 'admin')).toBe(false);
  });

  it('rejects malformed requests', () => {
    expect(parseCurrentParticipantsRequest({ type: 'current_participants.toggle' })).toBeNull();
    expect(
      parseCurrentParticipantsRequest({ type: 'current_participants.toggle', from: 'x' }),
    ).toBeNull();
    expect(
      parseCurrentParticipantsRequest({
        type: 'current_participants.reorder',
        from: 'x',
        startIndex: -1,
        endIndex: 0,
      }),
    ).toBeNull();
  });

  it('lets an admin phone remove another singer', () => {
    const d = deps();
    handleCurrentParticipantsEvent(
      { type: 'current_participants.toggle', from: 'admin', deviceId: 'guest' },
      d,
    );
    expect(d.toggle).toHaveBeenCalledWith('guest', { name: 'Admin', hue: 10 });
  });

  it('lets a singer toggle only itself and reorder nothing', () => {
    const d = deps();
    handleCurrentParticipantsEvent(
      { type: 'current_participants.toggle', from: 'guest', deviceId: 'admin' },
      d,
    );
    handleCurrentParticipantsEvent(
      { type: 'current_participants.reorder', from: 'guest', startIndex: 0, endIndex: 1 },
      d,
    );
    expect(d.toggle).not.toHaveBeenCalled();
    expect(d.reorder).not.toHaveBeenCalled();
    expect(d.onDenied).toHaveBeenCalledTimes(2);

    handleCurrentParticipantsEvent(
      { type: 'current_participants.toggle', from: 'guest', deviceId: 'p-guest' },
      d,
    );
    expect(d.toggle).toHaveBeenCalledTimes(1);
  });

  it('ignores requests from unknown senders', () => {
    const d = deps();
    handleCurrentParticipantsEvent(
      { type: 'current_participants.toggle', from: 'stranger', deviceId: 'stranger' },
      d,
    );
    expect(d.toggle).not.toHaveBeenCalled();
    expect(d.onDenied).not.toHaveBeenCalled();
  });
});

describe('toggleParticipant / moveParticipant', () => {
  it('removes by device id, profile id or peer id and adds otherwise', () => {
    const list = [{ deviceId: 'd1', profileId: 'p1' }, { deviceId: 'peer2' }];
    expect(toggleParticipant(list, 'd1')).toEqual([{ deviceId: 'peer2' }]);
    expect(toggleParticipant(list, 'p1')).toEqual([{ deviceId: 'peer2' }]);
    expect(toggleParticipant(list, 'dev2', { peerId: 'peer2' })).toEqual([list[0]]);
    const added = toggleParticipant(list, 'd3', { name: 'New', hue: 5 });
    expect(added).toHaveLength(3);
    expect(added[2]).toMatchObject({ deviceId: 'd3', profileId: 'd3', name: 'New', hue: 5 });
  });

  it('moves within range and ignores out-of-range indexes', () => {
    const list = [{ deviceId: 'a' }, { deviceId: 'b' }, { deviceId: 'c' }];
    expect(moveParticipant(list, 0, 2).map((p) => p.deviceId)).toEqual(['b', 'c', 'a']);
    expect(moveParticipant(list, 5, 0)).toBe(list);
  });
});
