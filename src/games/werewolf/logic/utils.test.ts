import { describe, it, expect } from 'vitest';
import { getDeathCascade } from './utils';
import type { Player } from './types';

describe('utils - getDeathCascade', () => {
    it('returns initial victims when no lovers exist', () => {
        const players: Player[] = [
            { id: '1', name: 'P1', role: 'VILLAGER', isAlive: true, needsToAct: false, powerState: {} },
            { id: '2', name: 'P2', role: 'VILLAGER', isAlive: true, needsToAct: false, powerState: {} },
        ];
        expect(getDeathCascade(['1'], players)).toEqual(['1']);
    });

    it('cascades death to alive lovers', () => {
        const players: Player[] = [
            { id: '1', name: 'P1', role: 'VILLAGER', isAlive: true, needsToAct: false, powerState: { loverIds: ['2'] } },
            { id: '2', name: 'P2', role: 'VILLAGER', isAlive: true, needsToAct: false, powerState: { loverIds: ['1', '3'] } },
            { id: '3', name: 'P3', role: 'VILLAGER', isAlive: true, needsToAct: false, powerState: { loverIds: ['2'] } },
            { id: '4', name: 'P4', role: 'VILLAGER', isAlive: true, needsToAct: false, powerState: {} },
        ];

        const result = getDeathCascade(['1'], players);
        expect(result.sort()).toEqual(['1', '2', '3'].sort());
    });

    it('ignores already dead lovers', () => {
        const players: Player[] = [
            { id: '1', name: 'P1', role: 'VILLAGER', isAlive: true, needsToAct: false, powerState: { loverIds: ['2'] } },
            { id: '2', name: 'P2', role: 'VILLAGER', isAlive: false, needsToAct: false, powerState: { loverIds: ['1'] } },
        ];

        const result = getDeathCascade(['1'], players);
        expect(result).toEqual(['1']);
    });

    it('handles cyclic lover relationships without infinite loops', () => {
        const players: Player[] = [
            { id: '1', name: 'P1', role: 'VILLAGER', isAlive: true, needsToAct: false, powerState: { loverIds: ['2'] } },
            { id: '2', name: 'P2', role: 'VILLAGER', isAlive: true, needsToAct: false, powerState: { loverIds: ['3'] } },
            { id: '3', name: 'P3', role: 'VILLAGER', isAlive: true, needsToAct: false, powerState: { loverIds: ['1'] } },
        ];

        const result = getDeathCascade(['1'], players);
        expect(result.sort()).toEqual(['1', '2', '3'].sort());
    });
});
