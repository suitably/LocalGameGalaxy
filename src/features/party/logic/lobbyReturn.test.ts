import { describe, expect, it } from 'vitest';
import { shouldFollowToLobby } from './lobbyReturn';

describe('shouldFollowToLobby (#647)', () => {
  it('follows only the change from a running game to the lobby', () => {
    expect(shouldFollowToLobby('in_game', 'lobby')).toBe(true);
    expect(shouldFollowToLobby(undefined, 'lobby')).toBe(false); // opened while in the lobby
    expect(shouldFollowToLobby('lobby', 'lobby')).toBe(false);
    expect(shouldFollowToLobby('lobby', 'in_game')).toBe(false);
  });
});
