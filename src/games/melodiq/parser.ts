/**
 * UltraStar TXT Lyric & Duet Parser
 *
 * Parses raw UltraStar-format `.txt` files into a structured `ParsedSong` object.
 *
 * ## UltraStar Format Overview
 * Lines beginning with `#` are header tags (e.g., `#BPM:120`, `#GAP:5000`).
 * Note lines follow the format: `TYPE START DURATION PITCH LYRICS`
 *
 * ### Note Types
 * | Type | Meaning |
 * |------|---------|
 * | `:`  | Normal note (scores points) |
 * | `*`  | Golden note (bonus multiplier) |
 * | `F`  | Freestyle note (no scoring) |
 * | `R`  | Rap note |
 * | `G`  | Golden rap note |
 * | `-`  | Line break marker |
 *
 * ### Timing Conversion
 * `time_ms = (beat / BPM * 60_000 / 4) + GAP_ms`
 * where BPM is from the `#BPM` header and GAP from `#GAP`.
 *
 * ### Duet Support
 * Lines starting with `P 1` or `P 2` switch the active track.
 * Track names come from `#DUETSINGERP1` / `#DUETSINGERP2` headers.
 */

/** A single scored or structural note in an UltraStar song track. */
export interface Note {
    /** Note type: `:` normal, `*` golden, `F` freestyle, `R` rap, `G` golden rap, `-` line break */
    type: string;
    /** Start beat (absolute, from the beginning of the song after GAP offset) */
    start: number;
    /** Duration in beats */
    duration: number;
    /** MIDI pitch number (0 = silence for line breaks) */
    pitch: number;
    /** Lyric syllable text displayed at this note */
    text: string;
}

/** A single singer's track, containing all their notes in order. */
export interface SongTrack {
    /** Display name of the singer (e.g., "Player 1" or the value from #DUETSINGERP1) */
    name: string;
    notes: Note[];
}

/** Fully parsed representation of an UltraStar `.txt` file. */
export interface ParsedSong {
    /** Raw key-value header map (keys uppercased, e.g., `BPM`, `TITLE`, `ARTIST`, `GAP`) */
    headers: Record<string, string>;
    /** @deprecated Use `tracks[0].notes` instead. Kept for backwards compatibility. */
    notes: Note[];
    /** All singer tracks. Single-singer songs have exactly one track. */
    tracks: SongTrack[];
    /** Beats per minute (parsed from `#BPM` header, comma-normalized, defaults to 120) */
    bpm: number;
    /** Timing gap in milliseconds before the first note (from `#GAP` header, defaults to 0) */
    gap: number;
}


/**
 * Parses the raw text content of an UltraStar `.txt` file into a structured `ParsedSong`.
 *
 * Handles both single-singer and duet formats. Track switches (`P 1` / `P 2`) are
 * processed in order; tracks are lazily created if a `P N` marker appears.
 *
 * European comma-decimal formats in BPM/GAP values are normalized before parsing.
 *
 * @param content - Raw UTF-8 string content of the `.txt` file.
 * @returns Fully structured `ParsedSong` with headers, tracks, and derived BPM/GAP.
 */
export const parseUltraStarTxt = (content: string): ParsedSong => {
    const lines = content.split(/\r?\n/);
    const headers: Record<string, string> = {};

    // Track management
    const tracks: SongTrack[] = [];
    // Initialize default track (Track 1)
    let currentTrackIndex = 0;

    // We'll prepare 2 tracks by default if Duet tags are found, 
    // but we can also just create them dynamically.
    // Let's create the first one.
    tracks.push({ name: 'Player 1', notes: [] });

    for (const line of lines) {
        if (line.startsWith('#')) {
            const separatorIndex = line.indexOf(':');
            if (separatorIndex > -1) {
                const key = line.substring(1, separatorIndex).trim().toUpperCase();
                const value = line.substring(separatorIndex + 1).trim();
                headers[key] = value;

                // Handle Duet Names
                if (key === 'DUETSINGERP1' || key === 'P1') {
                    tracks[0].name = value;
                } else if (key === 'DUETSINGERP2' || key === 'P2') {
                    // Ensure track 2 exists
                    if (tracks.length < 2) {
                        tracks.push({ name: value, notes: [] });
                    } else {
                        tracks[1].name = value;
                    }
                }
            }
        } else if (line.startsWith('P') && line.length > 1 && !line.startsWith('E')) {
            // START OF TRACK SWITCH: P 1 or P 2 or P1 or P2
            // Check for space-less P1/P2 first or P 1 / P 2
            let playerNum = NaN;

            if (line.includes(' ')) {
                const parts = line.split(' ');
                if (parts.length >= 2) {
                    playerNum = parseInt(parts[1], 10);
                }
            } else {
                // Try parsing the rest of the string as a number (e.g. "P1" -> 1)
                const suffix = line.substring(1);
                playerNum = parseInt(suffix, 10);
            }

            if (!isNaN(playerNum) && playerNum > 0) {
                currentTrackIndex = playerNum - 1;
                // Ensure track exists
                while (tracks.length <= currentTrackIndex) {
                    tracks.push({ name: `Player ${tracks.length + 1}`, notes: [] });
                }
            }
        } else if (line.startsWith(':') || line.startsWith('*') || line.startsWith('F') || line.startsWith('R') || line.startsWith('G')) {
            // Basic note parsing: TYPE START LENGTH PITCH LYRICS
            const parts = line.split(' ');
            if (parts.length >= 5) {
                const note = {
                    type: parts[0],
                    start: parseInt(parts[1], 10),
                    duration: parseInt(parts[2], 10),
                    pitch: parseInt(parts[3], 10),
                    text: parts.slice(4).join(' ')
                };

                // Add to current track
                if (tracks[currentTrackIndex]) {
                    tracks[currentTrackIndex].notes.push(note);
                }
            }
        } else if (line.startsWith('-')) {
            // Line break: - START [END]
            const parts = line.split(' ');
            if (parts.length >= 2) {
                const note = {
                    type: '-',
                    start: parseInt(parts[1], 10),
                    duration: 0,
                    pitch: 0, // Ignored for breaks
                    text: ''
                };

                // Add to current track
                if (tracks[currentTrackIndex]) {
                    tracks[currentTrackIndex].notes.push(note);
                }
            }
        }
    }

    // Extract BPM and GAP with defaults
    // Replace comma with dot for float parsing just in case (e.g. European format)
    const bpmString = headers['BPM'] ? headers['BPM'].replace(',', '.') : '120';
    const bpm = parseFloat(bpmString) || 120;

    const gapString = headers['GAP'] ? headers['GAP'].replace(',', '.') : '0';
    const gap = parseFloat(gapString) || 0;

    // Backward compatibility: Set generic notes to Track 1 (or all merged? usually apps just expect main melody)
    // Let's set it to Track 1 for now, as that's usually the main melody or melody + duet P1
    const notes = tracks.length > 0 ? tracks[0].notes : [];

    return { headers, tracks, notes, bpm, gap };
};
