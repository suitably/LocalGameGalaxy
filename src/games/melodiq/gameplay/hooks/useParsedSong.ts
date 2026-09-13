import { useState, useEffect } from 'react';
import { type Song } from '../../db';
import { parseUltraStarTxt } from '../../parser';
import { type SongWithNotes } from '../PitchVisualizer';

export function useParsedSong(song: Song) {
    const [parsedSong, setParsedSong] = useState<SongWithNotes | null>(null);
    const [contentLoading, setContentLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        setContentLoading(true);
        setLoadError(null);
        try {
            if (!song.txtContent) throw new Error("No UltraStar TXT found for this song.");
            const parsed = parseUltraStarTxt(song.txtContent);
            if (mounted && parsed) setParsedSong(parsed as any);
        } catch (e) {
            console.error("Failed to parse song TXT", e);
            if (mounted) setLoadError("Failed to parse song format.");
        } finally {
            if (mounted) setContentLoading(false);
        }
        return () => { mounted = false; };
    }, [song.id, song.txtContent]);

    return { parsedSong, contentLoading, loadError };
}
