import { describe, expect, it, vi } from 'vitest';
import { createMemoryTransport } from '../../../modules/room-game/roomTransport';
import { RoomStatePeer } from '../../../modules/room-game/roomPeer';
import { stampSender } from '../../../modules/room-game/peerTransport';
import type { SongMeta } from '../db';
import type { QueueItem } from '../hooks/useQueue';
import {
  canEditQueueItem,
  canForcePlay,
  canRequestSong,
  handleQueueEvent,
  INITIAL_QUEUE_ROOM,
  parseQueueRequest,
  queueRoomAllows,
  queueRoomReducer,
  type QueueHostDeps,
  type QueueRoomAction,
  type QueueRoomState,
} from './queueRoom';

const song = (id: string): SongMeta => ({ id, title: `T ${id}`, artist: 'A' }) as SongMeta;
const item = (id: string, requesterId?: string): QueueItem => ({
  id,
  song: song(`s_${id}`),
  addedAt: 1,
  requesterId,
});

describe('queueRoomReducer / queueRoomAllows', () => {
  const action: QueueRoomAction = {
    type: 'HOST_QUEUE',
    queue: [item('i1')],
    nowPlaying: song('np'),
  };

  it('replaces the state with the host queue', () => {
    expect(queueRoomReducer(INITIAL_QUEUE_ROOM, action)).toEqual({
      queue: action.queue,
      nowPlaying: action.nowPlaying,
    });
  });

  it('allows HOST_QUEUE only from the host id', () => {
    const allows = queueRoomAllows('host');
    expect(allows(INITIAL_QUEUE_ROOM, action, 'host')).toBe(true);
    expect(allows(INITIAL_QUEUE_ROOM, action, 'dev_a')).toBe(false);
    expect(queueRoomAllows('')(INITIAL_QUEUE_ROOM, action, '')).toBe(false);
  });

  it('a phone cannot change the room state; the host mirror reaches phones', () => {
    const transport = createMemoryTransport();
    const opts = {
      transport,
      channel: 'melodiq-queue_room',
      reducer: queueRoomReducer,
      authorize: queueRoomAllows('host'),
      initialState: INITIAL_QUEUE_ROOM,
      onChange: () => {},
    };
    const host = new RoomStatePeer<QueueRoomState, QueueRoomAction>({
      ...opts,
      playerId: 'host',
      isHost: true,
    });
    const phone = new RoomStatePeer<QueueRoomState, QueueRoomAction>({
      ...opts,
      playerId: 'dev_a',
      isHost: false,
    });
    host.start();
    phone.start();
    phone.dispatch({ type: 'HOST_QUEUE', queue: [item('evil')], nowPlaying: null });
    expect(host.current.state).toEqual(INITIAL_QUEUE_ROOM);
    host.dispatch(action);
    expect(phone.current.state.queue).toEqual(action.queue);
    expect(phone.isSynced).toBe(true);
  });
});

describe('permissions', () => {
  it('lets everyone but singers request songs; managers force play', () => {
    expect(canRequestSong('queue_contributor')).toBe(true);
    expect(canRequestSong(undefined)).toBe(true);
    expect(canRequestSong('singer')).toBe(false);
    expect(canForcePlay('admin')).toBe(true);
    expect(canForcePlay('queue_manager')).toBe(true);
    expect(canForcePlay('queue_contributor')).toBe(false);
  });

  it('lets managers edit every entry and contributors only their own', () => {
    expect(canEditQueueItem('admin', item('i', 'x'), 'dev_a')).toBe(true);
    expect(canEditQueueItem('queue_contributor', item('i', 'dev_a'), 'dev_a')).toBe(true);
    expect(canEditQueueItem('queue_contributor', item('i', 'x'), 'dev_a')).toBe(false);
    expect(canEditQueueItem('queue_contributor', undefined, 'dev_a')).toBe(false);
    expect(canEditQueueItem('singer', item('i', 'dev_a'), 'dev_a')).toBe(false);
  });
});

describe('parseQueueRequest', () => {
  it('parses each request with its payload', () => {
    expect(parseQueueRequest({ type: 'queue.add', from: 'a', songId: 's' })).toEqual({
      type: 'queue.add',
      from: 'a',
      songId: 's',
    });
    expect(parseQueueRequest({ type: 'queue.remove', from: 'a', itemId: 'i' })).toEqual({
      type: 'queue.remove',
      from: 'a',
      itemId: 'i',
    });
    expect(
      parseQueueRequest({
        type: 'queue.toggle_participant',
        from: 'a',
        itemId: 'i',
        deviceId: 'd',
        profile: { name: 'N', hue: 3, deviceId: 'd', extra: 1 },
      }),
    ).toEqual({
      type: 'queue.toggle_participant',
      from: 'a',
      itemId: 'i',
      deviceId: 'd',
      profile: { name: 'N', hue: 3 },
    });
    expect(
      parseQueueRequest({
        type: 'queue.reorder_participant',
        from: 'a',
        itemId: 'i',
        startIndex: 0,
        endIndex: 2,
      }),
    ).toMatchObject({ startIndex: 0, endIndex: 2 });
    expect(
      parseQueueRequest({ type: 'queue.select_song', from: 'a', songId: 's', forcePlay: 'yes' }),
    ).toEqual({ type: 'queue.select_song', from: 'a', songId: 's', forcePlay: false });
  });

  it('rejects old types, missing senders and invalid payloads', () => {
    expect(parseQueueRequest({ type: 'remote.select_song', from: 'a', songId: 's' })).toBeNull();
    expect(parseQueueRequest({ type: 'queue.get', from: 'a' })).toBeNull();
    expect(parseQueueRequest({ type: 'queue.add', songId: 's' })).toBeNull();
    expect(parseQueueRequest({ type: 'queue.add', from: '', songId: 's' })).toBeNull();
    expect(parseQueueRequest({ type: 'queue.remove', from: 'a' })).toBeNull();
    expect(
      parseQueueRequest({
        type: 'queue.reorder_participant',
        from: 'a',
        itemId: 'i',
        startIndex: -1,
        endIndex: 1,
      }),
    ).toBeNull();
    expect(
      parseQueueRequest({ type: 'queue.toggle_participant', from: 'a', itemId: 'i' }),
    ).toBeNull();
    expect(parseQueueRequest(null)).toBeNull();
  });
});

const ROLES: Record<string, string> = {
  dev_admin: 'admin',
  dev_contrib: 'queue_contributor',
  dev_singer: 'singer',
};
const CHANNEL = 'melodiq_room_live';

/** Host handler on a memory transport with fake roles, peers, library and queue functions. */
function hostHarness() {
  const transport = createMemoryTransport();
  const queue = [item('own', 'dev_contrib'), item('other', 'dev_admin')];
  const deps = {
    getRole: vi.fn((id: string) => ROLES[id] ?? 'singer'),
    getPeer: (id: string) =>
      id in ROLES ? { peerId: `p_${id}`, name: `N ${id}`, hue: 7 } : undefined,
    getQueue: () => queue,
    findSong: (id: string) => (id === 'known' ? song(id) : undefined),
    addToQueue: vi.fn(),
    removeFromQueue: vi.fn(),
    toggleQueueParticipant: vi.fn(),
    reorderQueueParticipant: vi.fn(),
    selectSong: vi.fn(),
    onDenied: vi.fn(),
  } satisfies QueueHostDeps;
  transport.subscribe(CHANNEL, (event) => handleQueueEvent(event, deps));
  const send = (event: object) => transport.publish(CHANNEL, event);
  return { deps, send };
}

describe('handleQueueEvent', () => {
  it('queue.add: adds a known song with the sender as requester; singers are denied', () => {
    const { deps, send } = hostHarness();
    send({ type: 'queue.add', from: 'dev_contrib', songId: 'known' });
    expect(deps.addToQueue).toHaveBeenCalledWith(song('known'), 'N dev_contrib', 'dev_contrib');
    send({ type: 'queue.add', from: 'dev_contrib', songId: 'missing' });
    send({ type: 'queue.add', from: 'dev_singer', songId: 'known' });
    expect(deps.addToQueue).toHaveBeenCalledTimes(1);
    expect(deps.onDenied).toHaveBeenCalledTimes(1);
  });

  it('ignores requests from senders that are not connected', () => {
    const { deps, send } = hostHarness();
    send({ type: 'queue.add', from: 'dev_ghost', songId: 'known' });
    expect(deps.addToQueue).not.toHaveBeenCalled();
    expect(deps.getRole).not.toHaveBeenCalled();
  });

  it('queue.select_song: forwards with force play only for managers', () => {
    const { deps, send } = hostHarness();
    send({ type: 'queue.select_song', from: 'dev_admin', songId: 's', forcePlay: true });
    send({ type: 'queue.select_song', from: 'dev_contrib', songId: 's', forcePlay: true });
    send({ type: 'queue.select_song', from: 'dev_singer', songId: 's', forcePlay: true });
    expect(deps.selectSong.mock.calls).toEqual([
      [{ songId: 's', forcePlay: true, requester: 'N dev_admin', requesterId: 'dev_admin' }],
      [{ songId: 's', forcePlay: false, requester: 'N dev_contrib', requesterId: 'dev_contrib' }],
    ]);
  });

  it('queue.remove / reorder: managers any entry, contributors only their own', () => {
    const { deps, send } = hostHarness();
    send({ type: 'queue.remove', from: 'dev_admin', itemId: 'own' });
    send({ type: 'queue.remove', from: 'dev_contrib', itemId: 'own' });
    send({ type: 'queue.remove', from: 'dev_contrib', itemId: 'other' });
    expect(deps.removeFromQueue.mock.calls).toEqual([['own'], ['own']]);
    send({
      type: 'queue.reorder_participant',
      from: 'dev_contrib',
      itemId: 'own',
      startIndex: 0,
      endIndex: 1,
    });
    send({
      type: 'queue.reorder_participant',
      from: 'dev_contrib',
      itemId: 'other',
      startIndex: 0,
      endIndex: 1,
    });
    expect(deps.reorderQueueParticipant.mock.calls).toEqual([['own', 0, 1]]);
    expect(deps.onDenied).toHaveBeenCalledTimes(2);
  });

  it('queue.toggle_participant: self toggle always, others need edit rights', () => {
    const { deps, send } = hostHarness();
    send({
      type: 'queue.toggle_participant',
      from: 'dev_singer',
      itemId: 'other',
      deviceId: 'dev_singer',
    });
    send({
      type: 'queue.toggle_participant',
      from: 'dev_singer',
      itemId: 'other',
      deviceId: 'p_dev_singer',
      profile: { name: 'Me' },
    });
    send({
      type: 'queue.toggle_participant',
      from: 'dev_singer',
      itemId: 'other',
      deviceId: 'dev_x',
    });
    send({
      type: 'queue.toggle_participant',
      from: 'dev_contrib',
      itemId: 'own',
      deviceId: 'dev_x',
    });
    expect(deps.toggleQueueParticipant.mock.calls).toEqual([
      ['other', 'dev_singer', { name: 'N dev_singer', hue: 7 }],
      ['other', 'p_dev_singer', { name: 'Me' }],
      ['own', 'dev_x', { name: 'N dev_contrib', hue: 7 }],
    ]);
    expect(deps.onDenied).toHaveBeenCalledTimes(1);
  });

  it('a forged `from` cannot escalate once the host stamps the sender', () => {
    const { deps, send } = hostHarness();
    const forged = { type: 'queue.remove', from: 'dev_admin', itemId: 'other' };
    send(stampSender(forged, 'dev_contrib') as object);
    expect(deps.getRole).toHaveBeenCalledWith('dev_contrib');
    expect(deps.removeFromQueue).not.toHaveBeenCalled();
  });

  it('ignores other room events', () => {
    const { deps, send } = hostHarness();
    send({ type: 'settings.get', from: 'dev_admin' });
    send({ type: 'queue.update', from: 'dev_admin', queue: [] });
    expect(deps.getRole).not.toHaveBeenCalled();
  });
});
