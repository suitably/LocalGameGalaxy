import { describe, it, expect } from 'vitest';
import { getActiveAbilities, getNightRolesToAct } from './nightRoles';
import type { Player, RoleDefinition } from './types';

const player = (id: string, role: string, isAlive = true, powerState = {}): Player => ({
  id,
  name: id,
  role,
  isAlive,
  needsToAct: false,
  powerState,
});

const custom = (abilities: RoleDefinition['abilities']): RoleDefinition => ({
  id: 'MY_ROLE',
  name: 'My role',
  description: '',
  icon: 'CUSTOM',
  alignment: 'VILLAGER',
  abilities,
  isCustom: true,
});

describe('nightRoles', () => {
  it('orders standard roles and skips first-night roles after round 1', () => {
    const players = [player('a', 'WEREWOLF'), player('b', 'CUPID'), player('c', 'SEER')];
    expect(getNightRolesToAct(players, [], 1, [])).toEqual(['CUPID', 'WEREWOLF', 'SEER']);
    expect(getNightRolesToAct(players, [], 2, [])).toEqual(['WEREWOLF', 'SEER']);
  });

  it('skips dead role holders but keeps the werewolf slot while a wolf lives', () => {
    const players = [player('a', 'WEREWOLF'), player('b', 'SEER', false)];
    expect(getNightRolesToAct(players, [], 2, [])).toEqual(['WEREWOLF']);
  });

  it('lets the black werewolf act only with infection power and a victim', () => {
    const players = [
      player('a', 'WEREWOLF'),
      player('b', 'BLACK_WEREWOLF', true, { hasInfected: true }),
    ];
    expect(getNightRolesToAct(players, [], 2, [])).toEqual(['WEREWOLF']);
    expect(getNightRolesToAct(players, [], 2, ['x'])).toEqual(['WEREWOLF', 'BLACK_WEREWOLF']);
  });

  it('appends alive custom roles that have an active ability', () => {
    const def = custom([{ type: 'KILL', timing: 'ROUND_NUMBER', roundNumber: 2, targetCount: 1 }]);
    const players = [player('a', 'WEREWOLF'), player('b', 'MY_ROLE')];
    expect(getNightRolesToAct(players, [def], 1, [])).toEqual(['WEREWOLF']);
    expect(getNightRolesToAct(players, [def], 2, [])).toEqual(['WEREWOLF', 'MY_ROLE']);
  });

  it('filters abilities by timing', () => {
    const def = custom([
      { type: 'KILL', timing: 'FIRST_NIGHT', targetCount: 1 },
      { type: 'HEAL', timing: 'EVERY_NIGHT', targetCount: 1 },
    ]);
    expect(getActiveAbilities(def, 1)).toHaveLength(2);
    expect(getActiveAbilities(def, 2).map((a) => a.type)).toEqual(['HEAL']);
  });
});
