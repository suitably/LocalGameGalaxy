import { describe, it, expect } from 'vitest';
import { verifyNotesMatch, type TargetNote } from '../../useNoteVerifier';

describe('verifyNotesMatch', () => {
    it('returns true when played pitch matches target pitch', () => {
        const targetNotes: TargetNote[] = [
            { pitch: 60, duration: 0.25 }
        ];

        expect(verifyNotesMatch(targetNotes, [60])).toBe(true);
        expect(verifyNotesMatch(targetNotes, [62])).toBe(false);
    });

    it('returns false when no targets or no played pitches', () => {
        const targetNotes: TargetNote[] = [
            { pitch: 60, duration: 0.25 }
        ];

        expect(verifyNotesMatch([], [60])).toBe(false);
        expect(verifyNotesMatch(targetNotes, [])).toBe(false);
    });

    it('returns true automatically when all target notes are tied continuations', () => {
        const targetNotes: TargetNote[] = [
            { pitch: 69, duration: 0.25, isTiedContinuation: true }
        ];

        // Player struck note previously, so no new keypress needed
        expect(verifyNotesMatch(targetNotes, [])).toBe(true);
    });

    it('requires striking only the non-tied note in a mixed chord with ties', () => {
        const targetNotes: TargetNote[] = [
            { pitch: 69, duration: 0.25, isTiedContinuation: true }, // Tied continuation
            { pitch: 48, duration: 0.125, isTiedContinuation: false } // Fresh note
        ];

        // Neither note played -> false
        expect(verifyNotesMatch(targetNotes, [])).toBe(false);

        // Wrong pitch played -> false
        expect(verifyNotesMatch(targetNotes, [50])).toBe(false);

        // Fresh note pitch 48 played -> true
        expect(verifyNotesMatch(targetNotes, [48])).toBe(true);
    });

    it('supports toleranceSemitones for microphone input', () => {
        const targetNotes: TargetNote[] = [
            { pitch: 60, duration: 0.25 }
        ];

        expect(verifyNotesMatch(targetNotes, [61], 1)).toBe(true);
        expect(verifyNotesMatch(targetNotes, [62], 1)).toBe(false);
    });
});
