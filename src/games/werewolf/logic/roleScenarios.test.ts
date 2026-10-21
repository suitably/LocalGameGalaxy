import { describe, it, expect } from 'vitest';
import { gameReducer } from './gameReducer';
import { INITIAL_STATE, type GameState, type Player } from './types';

// Scenarios formerly in logic/tests/verify_*.ts, which were plain scripts that never ran (#424).

const player = (id: string, role: string, name: string): Player => ({
  id,
  name,
  role,
  isAlive: true,
  needsToAct: false,
  powerState: {},
});

const nightState = (players: Player[]): GameState => ({
  ...INITIAL_STATE,
  players,
  phase: 'NIGHT',
  round: 1,
});

describe('werewolf role scenarios', () => {
  it('Easter Bunny wins only once every living player, including itself, has an egg', () => {
    let state = nightState([
      player('p1', 'EASTER_BUNNY', 'Bunny'),
      player('p2', 'VILLAGER', 'Alice'),
      player('p3', 'WEREWOLF', 'Wolf'),
    ]);

    state = gameReducer(state, {
      type: 'NIGHT_ACTION',
      role: 'EASTER_BUNNY',
      action: { type: 'GIVE_EGG', targetIds: ['p2', 'p3'] },
    });
    expect(state.winner).toBeFalsy();

    state = gameReducer(state, {
      type: 'NIGHT_ACTION',
      role: 'EASTER_BUNNY',
      action: { type: 'GIVE_EGG', targetIds: ['p1'] },
    });
    expect(state.winner).toBe('EASTER_BUNNY');
  });

  it('a hunter killed at night gets the HUNTER_SHOT phase at daybreak', () => {
    const afterKill = gameReducer(
      nightState([
        player('1', 'HUNTER', 'Hunter'),
        player('2', 'WEREWOLF', 'Wolf'),
        player('3', 'VILLAGER', 'Villager'),
      ]),
      { type: 'NIGHT_ACTION', role: 'WEREWOLF', action: { type: 'KILL', targetId: '1' } },
    );

    const day = gameReducer(afterKill, { type: 'NEXT_PHASE' });
    expect(day.phase).toBe('HUNTER_SHOT');
    expect(day.pendingHunterIds).toContain('1');
  });

  it("the guardian's protection keeps the target out of the kill log", () => {
    const afterProtect = gameReducer(
      nightState([
        player('1', 'GUARDIAN', 'Guardian'),
        player('2', 'HUNTER', 'Hunter'),
        player('3', 'WEREWOLF', 'Wolf'),
      ]),
      { type: 'NIGHT_ACTION', role: 'GUARDIAN', action: { type: 'PROTECT', targetId: '2' } },
    );
    expect(afterProtect.players.find((p) => p.id === '2')?.powerState.isProtected).toBe(true);

    const afterKill = gameReducer(afterProtect, {
      type: 'NIGHT_ACTION',
      role: 'WEREWOLF',
      action: { type: 'KILL', targetId: '2' },
    });
    expect(afterKill.nightActionLog).not.toContain('2');
  });
});
