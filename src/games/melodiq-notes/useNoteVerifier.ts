import { useState, useEffect, useRef } from 'react';

export interface TargetNote {
    pitch: number; // MIDI note number, 0 for rests
    step?: string;
    octave?: number;
    duration?: number;
    isRest?: boolean;
    noteElement?: SVGElement | Element | null;
}

interface NoteVerifierProps {
    targetNotes: TargetNote[];
    playedPitches: number[]; // From MIDI or Microphone
    toleranceSemitones?: number;
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
        if (!targetNotes || targetNotes.length === 0 || playedPitches.length === 0) {
            setIsCurrentNoteHit(false);
            return;
        }

        const playableTargets = targetNotes.filter(t => !t.isRest && t.pitch > 0);
        if (playableTargets.length === 0) {
            setIsCurrentNoteHit(false);
            return;
        }

        // Check if any of playedPitches matches any of playableTargets
        const matched = playableTargets.some(target =>
            playedPitches.some(played =>
                Math.abs(played - target.pitch) <= toleranceSemitones
            )
        );

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
