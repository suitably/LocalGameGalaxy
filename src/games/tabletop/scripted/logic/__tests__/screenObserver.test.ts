import { describe, expect, it } from 'vitest';
import { createMemoryTransport } from '../../../../../modules/room-game';
import { SealedRoomPeer } from '../sealedRoomPeer';
import { emptySession, sessionReducer } from '../session';

const players = [
  { id: 'h', name: 'Host' },
  { id: 'a', name: 'Ann' },
];
const started = () =>
  sessionReducer(emptySession('schwimmen'), {
    type: 'START',
    scriptId: 'schwimmen',
    players,
    seed: 7,
  });

const mk = (t: ReturnType<typeof createMemoryTransport>, id: string, isHost: boolean) =>
  new SealedRoomPeer({
    transport: t,
    channel: 'c',
    playerId: id,
    isHost,
    initialState: isHost ? started() : emptySession('schwimmen'),
    onChange: () => {},
  });
const settle = async (...ps: SealedRoomPeer[]) => {
  for (let i = 0; i < 4; i++) for (const p of ps) await p.idle();
};

describe('screen observer (no seat, no party membership)', () => {
  it('gets the public table without any hand and cannot move', async () => {
    const t = createMemoryTransport();
    const host = mk(t, 'h', true);
    host.start();
    const tv = mk(t, 'screen-1', false);
    tv.start();
    await settle(host, tv);
    expect(tv.isSynced).toBe(true);
    expect(tv.current?.view).not.toBeNull();
    expect(tv.current?.view?.hand ?? []).toEqual([]);
    expect(JSON.stringify(tv.current)).not.toContain(
      JSON.stringify(host.current?.view?.hand ?? ['?']),
    );
    const step = host.current?.step;
    tv.dispatch({ type: 'MOVE', seat: 0, move: { kind: 'action', id: 'x' } });
    tv.dispatch({ type: 'END' });
    await settle(host, tv);
    expect(host.current?.step).toBe(step);
    expect(host.current?.view).not.toBeNull();
  });
});
