import { bench, describe } from 'vitest';
import { getDeathCascade } from './utils';
import type { Player } from './types';

function createMockPlayers(count: number): Player[] {
    const players: Player[] = [];
    for (let i = 0; i < count; i++) {
        const loverIds: string[] = [];
        // Create a chain of lovers: i -> i+1 (for even i) or circular pairs/chains
        if (i % 2 === 0 && i + 1 < count) {
            loverIds.push(String(i + 1));
        } else if (i % 2 === 1) {
            loverIds.push(String(i - 1));
        }
        players.push({
            id: String(i),
            name: `Player ${i}`,
            role: 'VILLAGER',
            isAlive: true,
            needsToAct: false,
            powerState: { loverIds },
        });
    }
    return players;
}

function createLongChainPlayers(count: number): Player[] {
    const players: Player[] = [];
    for (let i = 0; i < count; i++) {
        const loverIds: string[] = [];
        if (i + 1 < count) {
            loverIds.push(String(i + 1));
        }
        players.push({
            id: String(i),
            name: `Player ${i}`,
            role: 'VILLAGER',
            isAlive: true,
            needsToAct: false,
            powerState: { loverIds },
        });
    }
    return players;
}

const players100 = createMockPlayers(100);
const players1000 = createMockPlayers(1000);
const players5000 = createMockPlayers(5000);

const chain1000 = createLongChainPlayers(1000);
const chain2000 = createLongChainPlayers(2000);

describe('getDeathCascade Benchmark', () => {
    bench('100 players paired lovers', () => {
        getDeathCascade(['0', '10', '20', '30'], players100);
    });

    bench('1000 players paired lovers', () => {
        getDeathCascade(['0', '100', '200', '300'], players1000);
    });

    bench('5000 players paired lovers', () => {
        getDeathCascade(['0', '500', '1000', '1500'], players5000);
    });

    bench('1000 players long chain cascade', () => {
        getDeathCascade(['0'], chain1000);
    });

    bench('2000 players long chain cascade', () => {
        getDeathCascade(['0'], chain2000);
    });
});
