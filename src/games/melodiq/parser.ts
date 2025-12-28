export interface Note {
    type: string; // ':' | '*' | 'F'
    start: number;
    duration: number; // in beats, usually
    pitch: number;
    text: string;
}

export interface ParsedSong {
    headers: Record<string, string>;
    notes: Note[];
}

export const parseUltraStarTxt = (content: string): ParsedSong => {
    const lines = content.split(/\r?\n/);
    const headers: Record<string, string> = {};
    const notes: Note[] = [];

    for (const line of lines) {
        if (line.startsWith('#')) {
            const separatorIndex = line.indexOf(':');
            if (separatorIndex > -1) {
                const key = line.substring(1, separatorIndex).trim().toUpperCase();
                const value = line.substring(separatorIndex + 1).trim();
                headers[key] = value;
            }
        } else if (line.startsWith(':') || line.startsWith('*') || line.startsWith('F')) {
            // Basic note parsing: TYPE START LENGTH PITCH LYRICS
            const parts = line.split(' ');
            if (parts.length >= 5) {
                notes.push({
                    type: parts[0],
                    start: parseInt(parts[1], 10),
                    duration: parseInt(parts[2], 10),
                    pitch: parseInt(parts[3], 10),
                    text: parts.slice(4).join(' ')
                });
            }
        }
    }

    return { headers, notes };
};
