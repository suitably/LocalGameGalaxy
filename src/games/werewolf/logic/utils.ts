import type { Player, RoleDefinition, Role } from './types';

export const isWerewolf = (player: Player, allRoles?: RoleDefinition[]): boolean => {
    // If infected, they count as a werewolf regardless of original role
    if (player.powerState?.isInfected) {
        return true;
    }

    const roleId = player.role;
    if (!roleId) return false;

    // Fast path for standard roles
    if (roleId === 'WEREWOLF' || roleId === 'BLACK_WEREWOLF' || roleId === 'WHITE_WEREWOLF') {
        return true;
    }

    // Wolfdog chooses camp on first night
    if (roleId === 'WOLFDOG' && player.powerState?.chosenCamp === 'WEREWOLF') {
        return true;
    }

    // Check for inheritance
    if (allRoles) {
        const checkInheritance = (id: string, visited: Set<string>): boolean => {
            if (visited.has(id)) return false; // Avoid infinite loops
            visited.add(id);

            const roleDef = allRoles.find(r => r.id === id);
            if (!roleDef) return false;

            if (roleDef.alignment === 'WEREWOLF') return true;
            if (roleDef.inheritsFrom) {
                // If it inherits from a known werewolf role
                if (roleDef.inheritsFrom === 'WEREWOLF' || roleDef.inheritsFrom === 'BLACK_WEREWOLF') return true;
                return checkInheritance(roleDef.inheritsFrom, visited);
            }
            return false;
        };

        return checkInheritance(roleId, new Set<string>());
    }

    return false;
};

export const isWerewolfRole = (roleId: Role, allRoles: RoleDefinition[]): boolean => {
    // Fast path for standard roles
    if (roleId === 'WEREWOLF' || roleId === 'BLACK_WEREWOLF' || roleId === 'WHITE_WEREWOLF') {
        return true;
    }

    // Wolfdog can be a werewolf
    if (roleId === 'WOLFDOG') {
        return true;
    }

    // Check custom roles and inheritance
    const checkRole = (id: string, visited: Set<string>): boolean => {
        if (visited.has(id)) return false;
        visited.add(id);

        const roleDef = allRoles.find(r => r.id === id);
        if (!roleDef) return false;

        if (roleDef.alignment === 'WEREWOLF') return true;
        if (roleDef.inheritsFrom) {
            if (roleDef.inheritsFrom === 'WEREWOLF' || roleDef.inheritsFrom === 'BLACK_WEREWOLF') return true;
            return checkRole(roleDef.inheritsFrom, visited);
        }
        return false;
    };

    return checkRole(roleId, new Set<string>());
};

export const getDeathCascade = (initialVictims: string[], players: Player[]): string[] => {
    const toDie = new Set<string>(initialVictims);
    const queue = [...initialVictims];

    while (queue.length > 0) {
        const victimId = queue.shift()!;
        const victim = players.find(p => p.id === victimId);

        if (victim?.powerState?.loverIds) {
            for (const loverId of victim.powerState.loverIds) {
                // If lover is not already marked for death and is currently alive (or in the game)
                if (!toDie.has(loverId)) {
                    const lover = players.find(p => p.id === loverId);
                    if (lover && lover.isAlive) {
                        toDie.add(loverId);
                        queue.push(loverId);
                    }
                }
            }
        }
    }

    return Array.from(toDie);
};

export const getWinningFaction = (
    players: Player[],
    allRoles: RoleDefinition[],
    phase: import('./types').GamePhase | null = null,
    round: number = 0,
    latestVictims: string[] = []
): import('./types').GameState['winner'] => {
    const alivePlayers = players.filter(p => p.isAlive);

    // 1. Angel Win: If an Angel is eliminated during the first day's vote
    if (phase === 'VOTING' && round === 1) {
        const deadAngel = players.find(p => p.role === 'ANGEL' && !p.isAlive && latestVictims.includes(p.id));
        if (deadAngel) {
            return 'ANGEL';
        }
    }

    // 2. Easter Bunny Check: If Easter Bunny is alive AND everyone (alive) has an egg
    const easterBunny = alivePlayers.find(p => p.role === 'EASTER_BUNNY');
    if (easterBunny) {
        // Check if all alive players have an egg
        const allHaveEggs = alivePlayers.every(p => p.powerState.hasEgg);
        if (allHaveEggs) {
            return 'EASTER_BUNNY';
        }
    }

    // Default Win Conditions
    const aliveWerewolves = alivePlayers.filter(p => isWerewolf(p, allRoles)).length;
    const aliveVillagers = alivePlayers.filter(p => !isWerewolf(p, allRoles)).length;

    if (aliveWerewolves === 0 && alivePlayers.length > 0) {
        return 'VILLAGERS';
    } else if (aliveWerewolves >= aliveVillagers && aliveWerewolves > 0) {
        return 'WEREWOLVES';
    }

    // TODO: Add other win conditions (White Werewolf, Ripper, etc.) here as we refactor

    return null;
};
