import { describe, expect, it } from 'vitest';
import { shouldFollowIntoGame, shouldFollowToLobby, visitedGameAt } from './lobbyReturn';

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

describe('a visit to the lobby during a game (#657)', () => {
  const running = {
    roomId: 'R',
    status: 'in_game' as const,
    statusAt: 10,
    activeGame: 'garticphone' as const,
  };
  it('does not bounce a player who came from the running game', () => {
    const visited = visitedGameAt(running, 'R');
    expect(visited).toBe(10);
    expect(shouldFollowIntoGame(visited, running)).toBe(false);
    // The host starts a new game: follow.
    expect(shouldFollowIntoGame(visited, { ...running, statusAt: 20 })).toBe(true);
  });
  it('opens the running game for a device that arrives by invite link', () => {
    expect(visitedGameAt(null, 'R')).toBeNull();
    expect(visitedGameAt({ ...running, status: 'lobby' }, 'R')).toBeNull();
    expect(shouldFollowIntoGame(null, running)).toBe(true);
    expect(shouldFollowIntoGame(null, { ...running, status: 'lobby' })).toBe(false);
  });
});
