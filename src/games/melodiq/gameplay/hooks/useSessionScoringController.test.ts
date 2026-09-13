import { describe, it, expect } from 'vitest';
import { filterVisiblePlayers, computeGridLayout } from './useSessionScoringController';
import { type PlayerRuntime } from './PlayerRuntime';

describe('useSessionScoringController logic', () => {
    const createMockPlayer = (id: string, name: string, options: Partial<PlayerRuntime['config']> = {}): PlayerRuntime => ({
        config: {
            id,
            name,
            hue: 120,
            deviceId: 'default-device',
            latency: 0,
            isRemote: false,
            ...options
        },
        trackIndex: 0,
        score: 0,
        trackScores: [0, 0],
        combo: 0,
        lastHit: null,
        activeSegments: {},
        pitchRef: { current: null },
        segmentsRef: { current: [] }
    } as unknown as PlayerRuntime);

    describe('filterVisiblePlayers', () => {
        it('keeps regular local players', () => {
            const players = [createMockPlayer('p1', 'Alice'), createMockPlayer('p2', 'Bob')];
            const result = filterVisiblePlayers(players, new Set());
            expect(result).toHaveLength(2);
        });

        it('filters out remote players without mic or manager', () => {
            const p1 = createMockPlayer('p1', 'Alice');
            const p2 = createMockPlayer('p2', 'Bob', { isRemote: true });
            const result = filterVisiblePlayers([p1, p2], new Set());
            expect(result).toHaveLength(1);
            expect(result[0].config.id).toBe('p1');
        });

        it('filters out players with hidePitch set to true', () => {
            const p1 = createMockPlayer('p1', 'Alice');
            const p2 = createMockPlayer('p2', 'Bob', { hidePitch: true });
            const result = filterVisiblePlayers([p1, p2], new Set());
            expect(result).toHaveLength(1);
            expect(result[0].config.id).toBe('p1');
        });

        it('filters to active participants when active keys are provided', () => {
            const p1 = createMockPlayer('p1', 'Alice');
            const p2 = createMockPlayer('p2', 'Bob');
            const result = filterVisiblePlayers([p1, p2], new Set(['p2']));
            expect(result).toHaveLength(1);
            expect(result[0].config.id).toBe('p2');
        });

        it('filters to client device when isClient and clientDeviceId are provided', () => {
            const p1 = createMockPlayer('p1', 'Alice', { deviceId: 'phone-1' });
            const p2 = createMockPlayer('p2', 'Bob', { deviceId: 'phone-2' });
            const result = filterVisiblePlayers([p1, p2], new Set(), true, 'phone-1');
            expect(result).toHaveLength(1);
            expect(result[0].config.id).toBe('p1');
        });

        it('returns empty array when custom layout rule is 0', () => {
            const p1 = createMockPlayer('p1', 'Alice');
            const result = filterVisiblePlayers([p1], new Set(), false, undefined, { 1: '0' });
            expect(result).toHaveLength(0);
        });
    });

    describe('computeGridLayout', () => {
        it('computes default single player grid', () => {
            const layout = computeGridLayout(1);
            expect(layout.rows).toEqual([1]);
            expect(layout.columnWidthPercent).toBe(100);
        });

        it('computes 2x2 grid for 4 players in auto mode', () => {
            const layout = computeGridLayout(4);
            expect(layout.rows).toEqual([2, 2]);
            expect(layout.columnWidthPercent).toBe(50);
        });

        it('computes custom dot-separated layout rules', () => {
            const layout = computeGridLayout(2, { 2: '1.1' });
            expect(layout.rows).toEqual([1, 1]);
            expect(layout.columnWidthPercent).toBe(100);
        });

        it('computes custom multi-column layout rules', () => {
            const layout = computeGridLayout(3, { 3: '1.2' });
            expect(layout.rows).toEqual([1, 2]);
            expect(layout.columnWidthPercent).toBe(50);
        });

        it('handles 0 players', () => {
            const layout = computeGridLayout(0);
            expect(layout.rows).toEqual([]);
            expect(layout.columnWidthPercent).toBe(100);
        });
    });
});
