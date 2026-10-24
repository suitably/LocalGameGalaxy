import type { Ability, Player, Role, RoleDefinition } from './types';
import { DEFAULT_ROLES } from './defaultRoles';
import { isWerewolf } from './utils';

export const NIGHT_ROLE_ORDER: Role[] = [
  'CUPID',
  'THIEF',
  'WOLFDOG',
  'GUARDIAN',
  'DORFMATRATZE',
  'WEREWOLF',
  'BLACK_WEREWOLF',
  'WHITE_WEREWOLF',
  'WITCH',
  'SEER',
  'DETECTIVE',
  'BLACK_CAT',
  'EASTER_BUNNY',
  'PYROMANIAC',
  'RIPPER',
  'SURVIVOR',
];

const FIRST_NIGHT_ONLY: Role[] = ['THIEF', 'CUPID', 'WOLFDOG'];

/** Abilities of a role definition that may be used in the given round. */
export const getActiveAbilities = (def: RoleDefinition, round: number): Ability[] =>
  (def.abilities || []).filter((ability) => {
    if (ability.timing === 'FIRST_NIGHT' && round > 1) return false;
    if (ability.timing === 'ROUND_NUMBER' && ability.roundNumber !== round) return false;
    return true;
  });

/** Ordered list of roles that have to act this night (standard roles first, then custom roles). */
export const getNightRolesToAct = (
  players: Player[],
  customRoles: RoleDefinition[],
  round: number,
  nightActionLog: string[],
): Role[] => {
  const standardRoles = NIGHT_ROLE_ORDER.filter((role) => {
    const exists = players.some((p) => p.role === role);
    if (!exists && role !== 'WEREWOLF' && role !== 'BLACK_WEREWOLF') return false;
    if (FIRST_NIGHT_ONLY.includes(role) && round > 1) return false;

    if (role === 'WEREWOLF') {
      const allRoles = [...DEFAULT_ROLES, ...customRoles];
      return players.some((p) => isWerewolf(p, allRoles) && p.isAlive);
    }

    if (role === 'BLACK_WEREWOLF') {
      const blackWolf = players.find((p) => p.role === 'BLACK_WEREWOLF' && p.isAlive);
      // Black wolf acts only if they have their power AND there is a victim to infect
      return !!blackWolf && blackWolf.powerState.hasInfected === true && nightActionLog.length > 0;
    }

    return players.some((p) => p.role === role && p.isAlive);
  });

  const activeCustomRoles = customRoles
    .filter(
      (cr) =>
        players.some((p) => p.role === cr.id && p.isAlive) &&
        getActiveAbilities(cr, round).length > 0,
    )
    .map((cr) => cr.id as Role);

  return [...standardRoles, ...activeCustomRoles];
};
