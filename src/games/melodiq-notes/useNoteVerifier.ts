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

    // Only notes that are not rests, have a valid pitch, and are not tied continuations require striking
    const strikeTargets = targetNotes.filter(
        t => !t.isRest && t.pitch > 0 && !t.isTiedContinuation
    );
    if (strikeTargets.length === 0) return false;

    if (playedPitches.length === 0) return false;

    return strikeTargets.some(target =>
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
    const lastScoredTargetsRef = useRef<TargetNote[] | null>(null);

    useEffect(() => {
        const matched = verifyNotesMatch(targetNotes, playedPitches, toleranceSemitones);
        setIsCurrentNoteHit(matched);

        if (matched) {
            if (lastScoredTargetsRef.current !== targetNotes) {
                lastScoredTargetsRef.current = targetNotes;
                setScore(s => s + 100);
                setHitCount(h => h + 1);
            }
        }
    }, [targetNotes, playedPitches, toleranceSemitones]);

    const resetStats = () => {
        setScore(0);
        setHitCount(0);
        setIsCurrentNoteHit(false);
        lastScoredTargetsRef.current = null;
    };

    return {
        score,
        hitCount,
        isCurrentNoteHit,
        resetStats
    };
};
