import type { Cursor } from 'opensheetmusicdisplay';
import type { TargetNote } from '../useNoteVerifier';
import { midiNoteFromPitchObject } from './musicXmlParser';

export interface CursorNotesResult {
    targetNotes: TargetNote[];
    stepDuration: number;
}

/**
 * Extracts target notes at current cursor position and calculates step duration
 * to the next cursor timestamp. This handles multi-voice and multi-staff scores
 * where voices have different note durations (e.g. sustaining whole note on upper
 * staff while lower staff plays consecutive eighth notes).
 */
export function extractCursorData(cursor: Cursor | null | undefined): CursorNotesResult {
    if (!cursor || !cursor.iterator || cursor.iterator.EndReached) {
        return { targetNotes: [], stepDuration: 0.25 };
    }

    const iterator = cursor.iterator;
    const voiceEntries = cursor.VoicesUnderCursor();
    const targets: TargetNote[] = [];
    let maxRestDur = 0;

    voiceEntries.forEach(ve => {
        ve.Notes.forEach(note => {
            if (note.Pitch) {
                const midi = midiNoteFromPitchObject(note.Pitch);
                if (midi !== null) {
                    const isTie = !!note.NoteTie;
                    const isTieStart = isTie && note.NoteTie?.StartNote === note;
                    const isTiedContinuation = isTie && note.NoteTie?.StartNote !== note;
                    const duration = (isTieStart && note.NoteTie?.Duration?.RealValue)
                        ? note.NoteTie.Duration.RealValue
                        : (note.Length?.RealValue ?? note.TypeLength?.RealValue ?? 0.25);

                    targets.push({
                        pitch: midi,
                        step: note.Pitch.FundamentalNote !== undefined ? String(note.Pitch.FundamentalNote) : undefined,
                        octave: note.Pitch.Octave,
                        duration,
                        isRest: false,
                        isTieStart,
                        isTiedContinuation,
                    });
                }
            } else {
                const dur = note.Length?.RealValue ?? note.TypeLength?.RealValue ?? 0;
                if (dur > maxRestDur) maxRestDur = dur;
            }
        });
    });

    let stepDuration = 0;
    try {
        const currentTimestamp = iterator.CurrentSourceTimestamp?.RealValue ?? 0;
        const clone = iterator.clone();
        clone.moveToNext();
        if (!clone.EndReached && clone.CurrentSourceTimestamp) {
            const diff = clone.CurrentSourceTimestamp.RealValue - currentTimestamp;
            if (diff > 0.00001 && diff < 1000) {
                stepDuration = diff;
            }
        }
    } catch {
        // In case cloning or moveToNext fails, fall back to note durations
    }

    if (stepDuration === 0) {
        if (targets.length > 0) {
            const positiveDurs = targets.map(t => t.duration).filter((d): d is number => typeof d === 'number' && d > 0);
            stepDuration = positiveDurs.length > 0 ? Math.min(...positiveDurs) : (maxRestDur > 0 ? maxRestDur : 0.25);
        } else {
            stepDuration = maxRestDur > 0 ? maxRestDur : (iterator.CurrentMeasure?.Duration?.RealValue ?? 1.0);
        }
    }

    if (targets.length === 0) {
        const restTargets: TargetNote[] = [{
            pitch: 0,
            duration: stepDuration,
            stepDuration,
            isRest: true,
        }];
        return { targetNotes: restTargets, stepDuration };
    }

    targets.forEach(t => {
        t.stepDuration = stepDuration;
    });

    return { targetNotes: targets, stepDuration };
}
