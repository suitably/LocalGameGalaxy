import { describe, expect, it } from 'vitest';
import { readLobbyRoster } from './lobbyRoster';

const reader = (store: Record<string, unknown>) => (key: string) => store[key] ?? null;

describe('readLobbyRoster', () => {
  const defaults = ['A', 'B'];

  it('prefers the shared roster over old per-game keys', () => {
    const read = reader({ shared: [{ name: 'Ann' }], old: ['Bob'] });
    expect(readLobbyRoster(read, 'shared', ['old'], defaults)).toEqual([
      { name: 'Ann', isRemote: false },
    ]);
  });

  it('migrates from the first non-empty old key in order', () => {
    const read = reader({ old1: [], old2: ['Bob', 'Cid'] });
    expect(readLobbyRoster(read, 'shared', ['old1', 'old2'], defaults).map((p) => p.name)).toEqual([
      'Bob',
      'Cid',
    ]);
  });

  it('marks all but the first as remote for remoteAfterFirst sources', () => {
    const read = reader({ v1: ['Me', 'You'] });
    expect(
      readLobbyRoster(read, 'shared', [{ key: 'v1', remoteAfterFirst: true }], defaults),
    ).toEqual([
      { name: 'Me', isRemote: false },
      { name: 'You', isRemote: true },
    ]);
  });

  it('never reads old keys again once the shared key exists, even when empty', () => {
    const read = reader({ shared: [], old: ['Bob'] });
    expect(readLobbyRoster(read, 'shared', ['old'], defaults).map((p) => p.name)).toEqual([
      'A',
      'B',
    ]);
  });

  it('drops malformed and blank entries', () => {
    const read = reader({ shared: ['  ', 3, null, { name: ' Eve ' }] });
    expect(readLobbyRoster(read, 'shared', [], defaults)).toEqual([
      { name: 'Eve', isRemote: false },
    ]);
  });

  it('falls back to the defaults', () => {
    expect(readLobbyRoster(reader({}), 'shared', ['old'], defaults).map((p) => p.name)).toEqual([
      'A',
      'B',
    ]);
  });
});
