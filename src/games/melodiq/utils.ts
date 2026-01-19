import { type Note } from './parser';

/**
 * Calculates the duration of a song in seconds based on its notes, BPM, and gap.
 * 
 * @param notes - Array of parsed notes from the UltraStar txt file
 * @param bpm - Beats per minute
 * @param gap - Gap in milliseconds before the song starts
 * @returns Duration in seconds
 */
export const calculateSongDuration = (notes: Note[], bpm: number, gap: number): number => {
    // Filter out line breaks and find the last actual note
    const actualNotes = notes.filter(n => n.type !== '-');

    if (actualNotes.length === 0) {
        return 0;
    }

    const lastNote = actualNotes[actualNotes.length - 1];
    const lastBeat = lastNote.start + lastNote.duration;

    // Use the same formula as MelodiqSession
    const bpmMultiplier = 4;
    const beatDuration = 60000 / (bpm * bpmMultiplier); // milliseconds per beat
    const durationMs = (lastBeat * beatDuration) + gap;

    return durationMs / 1000; // Convert to seconds
};

/**
 * Formats a duration in seconds to MM:SS format.
 * 
 * @param seconds - Duration in seconds
 * @returns Formatted string in MM:SS format
 */
export const formatDuration = (seconds: number): string => {
    if (!seconds || seconds < 0) {
        return '0:00';
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
