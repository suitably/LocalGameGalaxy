import { describe, it, expect } from 'vitest';
import { selectActiveLineIndex, type LineBounds } from './lyricsLineSelection';

// 1000 ms per beat keeps the maths readable: linger = 0.8 beats, lead = 0.3 beats.
const MS = 1000;
const mk = (...pairs: [number, number][]): LineBounds[] =>
    pairs.map(([startBeat, endBeat]) => ({ startBeat, endBeat }));

describe('selectActiveLineIndex', () => {
    it('keeps the line during linger when the gap is long', () => {
        const lines = mk([0, 4], [10, 14]);
        expect(selectActiveLineIndex(lines, 4.7, MS)).toBe(0);
        expect(selectActiveLineIndex(lines, 4.9, MS)).toBe(1);
    });

    it('switches before the next start when the gap is short', () => {
        const lines = mk([0, 4], [4.6, 8]); // gap 0.6 -> lead 0.3 -> switch at 4.3
        expect(selectActiveLineIndex(lines, 4.2, MS)).toBe(0);
        expect(selectActiveLineIndex(lines, 4.4, MS)).toBe(1);
    });

    it('switches exactly at the end when there is no gap', () => {
        const lines = mk([0, 4], [4, 8]);
        expect(selectActiveLineIndex(lines, 4, MS)).toBe(0);
        expect(selectActiveLineIndex(lines, 4.01, MS)).toBe(1);
    });

    it('uses half of a tiny gap as lead and never switches before the end', () => {
        const lines = mk([0, 4], [4.2, 8]); // lead 0.1 -> switch at 4.1
        expect(selectActiveLineIndex(lines, 4.05, MS)).toBe(0);
        expect(selectActiveLineIndex(lines, 4.15, MS)).toBe(1);
    });

    it('lingers after the last line, then reports done', () => {
        const lines = mk([0, 4], [10, 14]);
        expect(selectActiveLineIndex(lines, 14.7, MS)).toBe(1);
        expect(selectActiveLineIndex(lines, 14.9, MS)).toBe(-1);
    });

    it('shows the first line before it starts', () => {
        expect(selectActiveLineIndex(mk([8, 12]), 0, MS)).toBe(0);
    });

    it('returns -1 without lines', () => {
        expect(selectActiveLineIndex([], 3, MS)).toBe(-1);
    });
});
