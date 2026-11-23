import { describe, expect, it } from 'vitest';
import type { Role } from './types';
import {
  INITIAL_WEREWOLF_ROOM,
  PACK_VOTE_SECONDS,
  currentNightRole,
  lynchedBy,
  werewolfRoomAllows,
  werewolfRoomReducer,
  type WerewolfRoomAction,
  type WerewolfRoomState,
} from './werewolfRoom';
import { werewolfRoomView } from './werewolfRoomView';

const SEATS = ['host', 'b', 'c', 'd', 'e'].map((id) => ({ id, name: id.toUpperCase() }));

const run = (state: WerewolfRoomState, ...actions: WerewolfRoomAction[]) =>
  actions.reduce(werewolfRoomReducer, state);

/** A started game with fixed roles (the engine shuffles them; set them back by seat). */
function started(roles: Role[], narrator = false): WerewolfRoomState {
  const players = narrator ? SEATS : SEATS.slice(0, roles.length);
  const state = run(
    INITIAL_WEREWOLF_ROOM,
    { type: 'SETUP', hostId: 'host', players },
    { type: 'START', roles, narrator },
  );
  return {
    ...state,
    game: {
      ...state.game,
      players: state.game.players.map((p, i) => ({
        ...p,
        role: roles[i],
        powerState: roles[i] === 'WITCH' ? { hasHealPotion: true, hasKillPotion: true } : {},
      })),
    },
  };
}

const seeAll = (state: WerewolfRoomState) =>
  run(state, ...state.game.players.map((p) => ({ type: 'SEEN' as const, playerId: p.id })));
/** Living players tap "ready" until the vote starts. */
const toVote = (state: WerewolfRoomState) =>
  state.game.players
    .filter((p) => p.isAlive)
    .reduce(
      (s, p) =>
        s.game.phase === 'DAY' ? werewolfRoomReducer(s, { type: 'READY', playerId: p.id }) : s,
      state,
    );
const roleOf = (state: WerewolfRoomState, id: string) =>
  state.game.players.find((p) => p.id === id);

describe('werewolf room', () => {
  it('starts with roles for every seat and keeps the host out as narrator', () => {
    const state = started(['WEREWOLF', 'SEER', 'VILLAGER', 'VILLAGER'], true);
    expect(state.game.phase).toBe('ROLE_REVEAL');
    expect(state.game.players.map((p) => p.id)).toEqual(['b', 'c', 'd', 'e']);
    expect(werewolfRoomView(state, null).me).toBeNull();
  });

  it('refuses roles it cannot play on phones and games without a wolf', () => {
    const setup = run(INITIAL_WEREWOLF_ROOM, { type: 'SETUP', hostId: 'host', players: SEATS });
    const bad = (roles: Role[]) =>
      werewolfRoomReducer(setup, { type: 'START', roles, narrator: false }).game.phase;
    expect(bad(['WEREWOLF', 'THIEF', 'VILLAGER', 'VILLAGER', 'VILLAGER'])).toBe('SETUP');
    expect(bad(['SEER', 'VILLAGER', 'VILLAGER', 'VILLAGER', 'VILLAGER'])).toBe('SETUP');
    expect(bad(['WEREWOLF', 'VILLAGER'])).toBe('SETUP');
  });

  it('calls the night roles in order once everyone has seen their card', () => {
    const state = seeAll(started(['WEREWOLF', 'SEER', 'WITCH', 'VILLAGER']));
    expect(state.game.phase).toBe('NIGHT');
    expect(state.nightOrder).toEqual(['WEREWOLF', 'WITCH', 'SEER']);
    expect(currentNightRole(state)).toBe('WEREWOLF');
  });

  it('lets only the called role act and resolves the night at dawn', () => {
    let state = seeAll(started(['WEREWOLF', 'SEER', 'WITCH', 'VILLAGER']));
    const kill = { type: 'KILL' as const, targetId: 'd' };
    expect(run(state, { type: 'NIGHT_ACTION', playerId: 'b', action: kill })).toBe(state);
    state = run(state, { type: 'NIGHT_ACTION', playerId: 'host', action: kill });
    expect(currentNightRole(state)).toBe('WITCH');
    expect(
      werewolfRoomView(state, 2).me?.turn?.players.find((p) => p.id === 'd')?.powerState,
    ).toEqual({ isDeadSoon: true });
    state = run(
      state,
      { type: 'NIGHT_SKIP', playerId: 'c' },
      { type: 'NIGHT_ACTION', playerId: 'b', action: { type: 'CHECK_ROLE', targetId: 'host' } },
    );
    expect(state.game.phase).toBe('DAY');
    expect(roleOf(state, 'd')?.isAlive).toBe(false);
    expect(werewolfRoomView(state, null).victims).toEqual(['d']);
    expect(werewolfRoomView(state, 1).me?.insights).toEqual([
      { round: 1, targetId: 'host', role: 'WEREWOLF' },
    ]);
    expect(werewolfRoomView(state, 3).me?.insights).toEqual([]);
  });

  it('spends the witch potions', () => {
    let state = seeAll(started(['WEREWOLF', 'WITCH', 'VILLAGER', 'VILLAGER', 'VILLAGER']));
    state = run(
      state,
      { type: 'NIGHT_ACTION', playerId: 'host', action: { type: 'KILL', targetId: 'c' } },
      { type: 'NIGHT_ACTION', playerId: 'b', action: { type: 'HEAL', targetId: 'c' } },
    );
    expect(state.game.phase).toBe('DAY');
    expect(roleOf(state, 'c')?.isAlive).toBe(true);
    expect(roleOf(state, 'b')?.powerState.hasHealPotion).toBe(false);
  });

  it('shows roles only to their owners and the pack to the wolves', () => {
    const state = started(['WEREWOLF', 'WEREWOLF', 'SEER', 'VILLAGER', 'VILLAGER']);
    const table = werewolfRoomView(state, null);
    expect(JSON.stringify(table)).not.toContain('SEER');
    expect(werewolfRoomView(state, 0).me?.pack).toEqual(['b']);
    expect(werewolfRoomView(state, 2).me).toMatchObject({ role: 'SEER', pack: [] });
    expect(JSON.stringify(werewolfRoomView(state, 3))).not.toContain('WEREWOLF');
  });

  it('kills the most voted player; a tie kills nobody', () => {
    const day = run(seeAll(started(['WEREWOLF', 'VILLAGER', 'VILLAGER', 'VILLAGER', 'VILLAGER'])), {
      type: 'NIGHT_SKIP',
      playerId: 'host',
    });
    expect(day.game.phase).toBe('DAY');
    const voting = toVote(day);
    const vote = (playerId: string, target: string) => ({
      type: 'VOTE' as const,
      playerId,
      target,
    });
    const tie = run(
      voting,
      vote('host', 'b'),
      vote('b', 'c'),
      vote('c', 'b'),
      vote('d', 'c'),
      vote('e', 'd'),
    );
    expect(tie.game.phase).toBe('NIGHT');
    expect(tie.game.players.every((p) => p.isAlive)).toBe(true);
    const won = run(
      voting,
      vote('host', 'b'),
      vote('b', 'host'),
      vote('c', 'host'),
      vote('d', 'host'),
      vote('e', 'host'),
    );
    expect(won.game.phase).toBe('GAME_OVER');
    expect(won.game.winner).toBe('VILLAGERS');
    expect(werewolfRoomView(won, null).result?.roles.host).toBe('WEREWOLF');
  });

  it('lets a dead hunter shoot from their own phone', () => {
    let state = seeAll(started(['WEREWOLF', 'HUNTER', 'VILLAGER', 'VILLAGER', 'VILLAGER']));
    state = run(state, {
      type: 'NIGHT_ACTION',
      playerId: 'host',
      action: { type: 'KILL', targetId: 'b' },
    });
    expect(state.game.phase).toBe('HUNTER_SHOT');
    expect(werewolfRoomView(state, null).hunter).toBe('b');
    expect(run(state, { type: 'HUNTER_SHOT', playerId: 'c', targetId: 'host' })).toBe(state);
    state = run(state, { type: 'HUNTER_SHOT', playerId: 'b', targetId: 'host' });
    expect(state.game.winner).toBe('VILLAGERS');
  });

  it('ends the game at dawn when the wolves reach parity', () => {
    const state = run(seeAll(started(['WEREWOLF', 'VILLAGER', 'VILLAGER', 'VILLAGER'])), {
      type: 'NIGHT_ACTION',
      playerId: 'host',
      action: { type: 'KILL', targetId: 'b' },
    });
    expect(state.game.phase).toBe('DAY');
    const last = run(
      toVote(state),
      { type: 'VOTE', playerId: 'host', target: 'c' },
      { type: 'VOTE', playerId: 'c', target: 'd' },
      { type: 'VOTE', playerId: 'd', target: 'host' },
    );
    // A tie: the night falls and the wolf kills again.
    const over = run(last, {
      type: 'NIGHT_ACTION',
      playerId: 'host',
      action: { type: 'KILL', targetId: 'c' },
    });
    expect(over.game.phase).toBe('GAME_OVER');
    expect(over.game.winner).toBe('WEREWOLVES');
  });

  describe('pack vote', () => {
    const night = () =>
      seeAll(started(['WEREWOLF', 'WEREWOLF', 'VILLAGER', 'VILLAGER', 'VILLAGER']));
    const pick = (playerId: string, targetId: string): WerewolfRoomAction => ({
      type: 'NIGHT_ACTION',
      playerId,
      action: { type: 'KILL', targetId },
    });

    it('kills once every wolf picks the same victim; picks may change', () => {
      let state = run(night(), pick('host', 'c'), pick('b', 'd'));
      expect(state.game.phase).toBe('NIGHT');
      expect(werewolfRoomView(state, 1).me?.turn?.picks).toEqual({ host: 'c', b: 'd' });
      expect(werewolfRoomView(state, 2).me?.turn).toBeNull();
      expect(JSON.stringify(werewolfRoomView(state, null))).not.toContain('picks');
      state = run(state, pick('b', 'c'));
      // Two wolves against two villagers: the dawn ends the game.
      expect(state.game.winner).toBe('WEREWOLVES');
      expect(roleOf(state, 'c')?.isAlive).toBe(false);
    });

    it('kills nobody when every wolf skips', () => {
      const state = run(
        night(),
        { type: 'NIGHT_SKIP', playerId: 'host' },
        { type: 'NIGHT_SKIP', playerId: 'b' },
      );
      expect(state.game.phase).toBe('DAY');
      expect(state.game.players.every((p) => p.isAlive)).toBe(true);
    });

    it('closes on the timer: a tie kills nobody', () => {
      const split = run(night(), pick('host', 'c'), pick('b', 'd'));
      const ended = run(split, { type: 'END_PACK_VOTE' });
      expect(ended.game.phase).toBe('DAY');
      expect(ended.game.players.every((p) => p.isAlive)).toBe(true);
      const one = run(night(), pick('b', 'd'), { type: 'END_PACK_VOTE' });
      expect(roleOf(one, 'd')?.isAlive).toBe(false);
      expect(werewolfRoomAllows(split, { type: 'END_PACK_VOTE' }, 'b', 'host')).toBe(false);
    });

    it('sets the pack timer once per wolves turn', () => {
      const timed = run(
        night(),
        { type: 'PACK_TIMER', at: 1000 },
        { type: 'PACK_TIMER', at: 5000 },
      );
      expect(werewolfRoomView(timed, null).packEndsAt).toBe(1000 + PACK_VOTE_SECONDS * 1000);
      const done = run(timed, { type: 'END_PACK_VOTE' });
      expect(done.packEndsAt).toBeNull();
    });
  });

  it('lets players act only for themselves and only the host steer', () => {
    const state = INITIAL_WEREWOLF_ROOM;
    expect(werewolfRoomAllows(state, { type: 'SEEN', playerId: 'b' }, 'b', 'host')).toBe(true);
    expect(werewolfRoomAllows(state, { type: 'SEEN', playerId: 'b' }, 'c', 'host')).toBe(false);
    expect(
      werewolfRoomAllows(state, { type: 'START', roles: [], narrator: false }, 'b', 'host'),
    ).toBe(false);
    expect(werewolfRoomAllows(state, { type: 'NEW_GAME' }, 'b', 'host')).toBe(true);
  });

  it('starts the vote once more than half of the living are ready; ready can be taken back', () => {
    const day = run(seeAll(started(['WEREWOLF', 'VILLAGER', 'VILLAGER', 'VILLAGER', 'VILLAGER'])), {
      type: 'NIGHT_SKIP',
      playerId: 'host',
    });
    const ready = (playerId: string): WerewolfRoomAction => ({ type: 'READY', playerId });
    const two = run(day, ready('b'), ready('c'), ready('c'), ready('d'));
    expect(two.game.phase).toBe('DAY');
    expect(werewolfRoomView(two, 1).me?.ready).toBe(true);
    expect(werewolfRoomView(two, null).readyCount).toBe(2);
    expect(run(two, ready('e')).game.phase).toBe('VOTING');
  });

  it('starts a new game only once it is over', () => {
    const state = seeAll(started(['WEREWOLF', 'VILLAGER', 'VILLAGER', 'VILLAGER']));
    expect(run(state, { type: 'NEW_GAME' })).toBe(state);
  });

  it('finds the lynched player', () => {
    expect(lynchedBy({ a: 'x', b: 'x', c: 'y' })).toBe('x');
    expect(lynchedBy({ a: 'x', b: 'y' })).toBeNull();
    expect(lynchedBy({})).toBeNull();
  });
});
