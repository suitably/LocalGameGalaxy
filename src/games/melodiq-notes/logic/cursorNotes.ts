import type { Cursor } from 'opensheetmusicdisplay';
import type { TargetNote } from '../useNoteVerifier';
import { midiNoteFromPitchObject } from './musicXmlParser';

export interface CursorNotesResult {
    targetNotes: TargetNote[];
    allCursorNotes: TargetNote[];
    stepDuration: number;
    isEndReached: boolean;
}

/**
 * Extracts target notes at current cursor position and calculates step duration
 * to the next cursor timestamp. Handles multi-voice, multi-staff, and multi-instrument
 * scores where voices have different note durations.
 */
export function extractCursorData(
    cursor: Cursor | null | undefined,
    selectedPartId?: string
): CursorNotesResult {
    if (!cursor || !cursor.iterator || cursor.iterator.EndReached) {
        return { targetNotes: [], allCursorNotes: [], stepDuration: 0.25, isEndReached: true };
    }

    const iterator = cursor.iterator;
    const voiceEntries = cursor.VoicesUnderCursor();
    const allNotes: TargetNote[] = [];
    let maxRestDur = 0;

    voiceEntries.forEach(ve => {
        // Retrieve instrument details from OSMD voice hierarchy
        const instrument = ve.ParentVoice?.Parent;
        const partId = instrument?.IdString || (instrument?.Name ? String(instrument.Name) : undefined);
        const partName = instrument?.Name || instrument?.PartAbbreviation || partId;
        const midiProgram = typeof instrument?.MidiInstrumentId === 'number' ? instrument.MidiInstrumentId : undefined;

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

                    allNotes.push({
                        pitch: midi,
                        step: note.Pitch.FundamentalNote !== undefined ? String(note.Pitch.FundamentalNote) : undefined,
                        octave: note.Pitch.Octave,
                        duration,
                        isRest: false,
                        isTieStart,
                        isTiedContinuation,
                        partId,
                        partName,
                        midiProgram,
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
        // Fall back to note durations if clone fails
    }

    if (stepDuration === 0) {
        if (allNotes.length > 0) {
            const positiveDurs = allNotes.map(t => t.duration).filter((d): d is number => typeof d === 'number' && d > 0);
            stepDuration = positiveDurs.length > 0 ? Math.min(...positiveDurs) : (maxRestDur > 0 ? maxRestDur : 0.25);
        } else {
            stepDuration = maxRestDur > 0 ? maxRestDur : (iterator.CurrentMeasure?.Duration?.RealValue ?? 1.0);
        }
    }

    allNotes.forEach(t => {
        t.stepDuration = stepDuration;
    });

    // Filter target notes for active player instrument if specified
    let targetNotes: TargetNote[] = [];
    if (selectedPartId && selectedPartId !== 'all') {
        targetNotes = allNotes.filter(n => n.partId === selectedPartId);
        if (targetNotes.length === 0) {
            targetNotes = [{
                pitch: 0,
                duration: stepDuration,
                stepDuration,
                isRest: true,
                partId: selectedPartId
            }];
        }
    } else {
        targetNotes = allNotes.length > 0 ? allNotes : [{
            pitch: 0,
            duration: stepDuration,
            stepDuration,
            isRest: true
        }];
    }

    return {
        targetNotes,
        allCursorNotes: allNotes,
        stepDuration,
        isEndReached: false,
    };
}
