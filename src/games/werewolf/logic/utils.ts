
import type { Player } from './types';

export const isWerewolf = (player: Player): boolean => {
    // If infected, they count as a werewolf regardless of original role
    if (player.powerState?.isInfected) {
        return true;
    }

    const role = player.role;
    if (!role) return false;

    // Check specific werewolf roles
    if (role === 'WEREWOLF' || role === 'BLACK_WEREWOLF' || role === 'WHITE_WEREWOLF') {
        return true;
    }

    // Wolfdog chooses camp on first night
    if (role === 'WOLFDOG' && player.powerState?.chosenCamp === 'WEREWOLF') {
        return true;
    }

    return false;
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
