import { describe, it, expect } from 'vitest';
import { localPlayerIdsForDevice } from './playerLogic';

describe('localPlayerIdsForDevice (#426)', () => {
  const game = [{ id: 'a' }, { id: 'b' }, { id: 'c', isRemote: true }];

  it('keeps players whose lobby entry is local', () => {
    expect(
      localPlayerIdsForDevice(game, [
        { name: 'A', isRemote: false },
        { name: 'B', isRemote: true },
      ]),
    ).toEqual(['a']);
  });

  it('uses the game flag when the lobby has no entry for that index', () => {
    expect(localPlayerIdsForDevice(game, [])).toEqual(['a', 'b']);
  });

  it('falls back to the first player when everyone is remote', () => {
    expect(
      localPlayerIdsForDevice([{ id: 'x', isRemote: true }], [{ name: 'X', isRemote: true }]),
    ).toEqual(['x']);
  });
});
