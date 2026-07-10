import type { Player, RoleDefinition, Role } from './types';

/**
 * Returns `true` if a **player instance** is currently aligned with the Werewolf faction.
 *
 * Checks in priority order:
 * 1. **Infection**: If `player.powerState.isInfected` is set (Black Werewolf ability), returns `true` regardless of role.
 * 2. **Standard Roles**: `WEREWOLF`, `BLACK_WEREWOLF`, `WHITE_WEREWOLF` are always werewolves.
 * 3. **Wolfdog Camp Choice**: If `WOLFDOG` player chose the `WEREWOLF` camp on night 1.
 * 4. **Custom Role Inheritance**: Recursively checks the `inheritsFrom` chain for `WEREWOLF` alignment.
 *
 * @param player - The player instance to evaluate.
 * @param allRoles - Optional custom role definitions for inheritance lookups.
 * @returns `true` if the player is currently on the werewolf team.
 */
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

/**
 * Returns `true` if a **role ID** is classified as a Werewolf-aligned role.
 *
 * Unlike `isWerewolf()`, this operates on the role definition rather than a
 * player instance, so infection and runtime camp choices are not considered.
 *
 * Used during game setup validation and win-condition checks.
 *
 * @param roleId - The role identifier string to check.
 * @param allRoles - All role definitions (built-in + custom) for inheritance resolution.
 * @returns `true` if the role is of werewolf alignment.
 */
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

/**
 * Computes the full set of players who die as a result of an initial set of victims,
 * expanding deaths via the **Lovers cascade** (Cupid link).
 *
 * If a player has `powerState.loverIds`, all of their living lovers also die.
 * The expansion is breadth-first, so chains of lovers (A loves B loves C) are fully resolved.
 *
 * @param initialVictims - Array of player IDs who are the direct victims (e.g., from Werewolf kill).
 * @param players - The full current player list (used to look up lover links and alive status).
 * @returns A deduplicated array of all player IDs who should die, including cascade deaths.
 */
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

/**
 * Evaluates all win conditions and returns the winning faction, or `null` if the game continues.
 *
 * Called after every death event and after the Pyromaniac BURN phase resolves.
 *
 * ## Win Condition Priority
 * Conditions are evaluated in order; the first match wins:
 * 1. **Angel**: Eliminated during `VOTING` in Round 1.
 * 2. **Easter Bunny**: All alive players hold an egg (given by Easter Bunny's `GIVE_EGG` action).
 * 3. **Villagers**: All werewolves are dead.
 * 4. **Werewolves**: Werewolf count ≥ Villager count (and at least 1 werewolf alive).
 *
 * @param players - Current full player list.
 * @param allRoles - All role definitions for alignment lookups.
 * @param phase - Current game phase (needed for Angel's round-1 vote check).
 * @param round - Current round number.
 * @param latestVictims - IDs of players who just died in this resolution cycle (for Angel check).
 * @returns The winning faction key, or `null` if no win condition is met.
 */
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
