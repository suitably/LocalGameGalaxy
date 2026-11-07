import { describe, expect, it } from 'vitest';
import { shouldFollowToLobby } from './lobbyReturn';

describe('shouldFollowToLobby (#647)', () => {
  it('follows the change from a running game to the lobby', () => {
    expect(shouldFollowToLobby('in_game', { status: 'lobby', statusAt: 2 })).toBe(true);
    expect(shouldFollowToLobby('lobby', { status: 'lobby', statusAt: 2 })).toBe(false);
    expect(shouldFollowToLobby('lobby', { status: 'in_game', statusAt: 3 })).toBe(false);
  });

  it('a page that opens after the game already ended goes to the lobby', () => {
    expect(shouldFollowToLobby(undefined, { status: 'lobby', statusAt: 2 })).toBe(true);
    // the room never ran a game: a game link opened there stays
    expect(shouldFollowToLobby(undefined, { status: 'lobby' })).toBe(false);
    expect(shouldFollowToLobby(undefined, { status: 'in_game', statusAt: 1 })).toBe(false);
  });
});
