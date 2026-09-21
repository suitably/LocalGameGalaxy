import { useState, useEffect, useRef } from 'react';

export interface TargetNote {
    pitch: number; // MIDI note number, 0 for rests
    step?: string;
    octave?: number;
    duration?: number;
    stepDuration?: number;
    isRest?: boolean;
    isTieStart?: boolean;
    isTiedContinuation?: boolean;
    noteElement?: SVGElement | Element | null;
}

interface NoteVerifierProps {
    targetNotes: TargetNote[];
    playedPitches: number[]; // From MIDI or Microphone
    toleranceSemitones?: number;
}

export function verifyNotesMatch(
    targetNotes: TargetNote[],
    playedPitches: number[],
    toleranceSemitones = 0
): boolean {
    if (!targetNotes || targetNotes.length === 0) return false;

    const playableTargets = targetNotes.filter(t => !t.isRest && t.pitch > 0);
    if (playableTargets.length === 0) return false;

    // If all playable targets are tied continuations, they were struck on the previous note
    const allTied = playableTargets.every(t => t.isTiedContinuation);
    if (allTied) return true;

    if (playedPitches.length === 0) return false;

    // Only notes that are not tied continuations require a fresh strike
    const strikeTargets = playableTargets.filter(t => !t.isTiedContinuation);
    const targetsToCheck = strikeTargets.length > 0 ? strikeTargets : playableTargets;

    return targetsToCheck.some(target =>
        playedPitches.some(played =>
            Math.abs(played - target.pitch) <= toleranceSemitones
        )
    );
}

export const useNoteVerifier = ({
    targetNotes,
    playedPitches,
    toleranceSemitones = 0 // 0 = exact pitch match
}: NoteVerifierProps) => {
    const [score, setScore] = useState<number>(0);
    const [hitCount, setHitCount] = useState<number>(0);
    const [isCurrentNoteHit, setIsCurrentNoteHit] = useState<boolean>(false);
    const lastHitTargetRef = useRef<string | null>(null);

    useEffect(() => {
        const matched = verifyNotesMatch(targetNotes, playedPitches, toleranceSemitones);
        setIsCurrentNoteHit(matched);

        if (matched) {
            const targetKey = targetNotes.map(n => n.pitch).sort().join('-');
            if (lastHitTargetRef.current !== targetKey) {
                lastHitTargetRef.current = targetKey;
                setScore(s => s + 100);
                setHitCount(h => h + 1);
            }
        }
    }, [targetNotes, playedPitches, toleranceSemitones]);

    const resetStats = () => {
        setScore(0);
        setHitCount(0);
        setIsCurrentNoteHit(false);
        lastHitTargetRef.current = null;
    };

    return {
        score,
        hitCount,
        isCurrentNoteHit,
        resetStats
    };
};
