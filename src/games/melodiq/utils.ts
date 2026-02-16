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

/**
 * Reads a file as text, attempting to detect the encoding.
 * 
 * Strategies:
 * 1. Try UTF-8 first
 * 2. If invalid characters are found (replacement char \uFFFD), fall back to Windows-1252 (ANSI)
 * 
 * @param file The file to read
 * @returns The file content as a string
 */
export const readFileAsText = async (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const buffer = e.target?.result as ArrayBuffer;
            if (!buffer) {
                resolve('');
                return;
            }

            // 1. Try UTF-8
            const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
            try {
                const text = utf8Decoder.decode(buffer);
                resolve(text);
            } catch (e) {
                // 2. Fallback to Windows-1252 (common for older UltraStar files, covers German/Danish)
                console.log('UTF-8 decoding failed, falling back to windows-1252');
                const win1252Decoder = new TextDecoder('windows-1252');
                const text = win1252Decoder.decode(buffer);
                resolve(text);
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsArrayBuffer(file);
    });
};
