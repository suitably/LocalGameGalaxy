import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import type { TargetNote } from './useNoteVerifier';
import { extractCursorData } from './logic/cursorNotes';

export interface SheetMusicViewerRef {
    nextNote: () => TargetNote[];
    previousNote: () => TargetNote[];
    resetCursor: () => TargetNote[];
    getCurrentNotes: () => TargetNote[];
    getStepDuration: () => number;
}

interface SheetMusicViewerProps {
    xmlContent: string;
    zoom?: number;
    isCurrentNoteHit?: boolean;
    onNotesChanged?: (targetNotes: TargetNote[]) => void;
    onSongEnd?: () => void;
    onBpmDetected?: (bpm: number) => void;
}

export const SheetMusicViewer = forwardRef<SheetMusicViewerRef, SheetMusicViewerProps>(({
    xmlContent,
    zoom = 1.0,
    isCurrentNoteHit = false,
    onNotesChanged,
    onSongEnd,
    onBpmDetected
}, ref) => {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Keep callback refs current without adding them to the OSMD load effect deps.
    const onNotesChangedRef = useRef(onNotesChanged);
    const onSongEndRef = useRef(onSongEnd);
    const onBpmDetectedRef = useRef(onBpmDetected);
    useEffect(() => {
        onNotesChangedRef.current = onNotesChanged;
        onSongEndRef.current = onSongEnd;
        onBpmDetectedRef.current = onBpmDetected;
    });

    const extractCurrentCursorNotes = useCallback((): TargetNote[] => {
        return extractCursorData(osmdRef.current?.cursor).targetNotes;
    }, []);

    const updateCursorHighlight = useCallback((isHit: boolean) => {
        if (!osmdRef.current || !osmdRef.current.cursor) return;
        const cursorElement = osmdRef.current.cursor.cursorElement;
        if (cursorElement) {
            cursorElement.style.backgroundColor = isHit
                ? 'rgba(76, 175, 80, 0.5)'
                : 'rgba(33, 150, 243, 0.5)';
            cursorElement.style.transition = 'background-color 0.15s ease';
        }
    }, []);

    useEffect(() => {
        updateCursorHighlight(isCurrentNoteHit);
    }, [isCurrentNoteHit, updateCursorHighlight]);

    useImperativeHandle(ref, () => ({
        nextNote: () => {
            if (osmdRef.current && osmdRef.current.cursor) {
                const cursor = osmdRef.current.cursor;
                if (cursor.iterator && cursor.iterator.EndReached) {
                    onSongEndRef.current?.();
                    return [];
                }
                cursor.next();
                if (cursor.iterator && cursor.iterator.EndReached) {
                    onSongEndRef.current?.();
                    return [];
                }
                const notes = extractCurrentCursorNotes();
                onNotesChangedRef.current?.(notes);
                return notes;
            }
            return [];
        },
        previousNote: () => {
            if (osmdRef.current && osmdRef.current.cursor) {
                osmdRef.current.cursor.previous();
                const notes = extractCurrentCursorNotes();
                onNotesChangedRef.current?.(notes);
                return notes;
            }
            return [];
        },
        resetCursor: () => {
            if (osmdRef.current && osmdRef.current.cursor) {
                osmdRef.current.cursor.reset();
                osmdRef.current.cursor.show();
                const notes = extractCurrentCursorNotes();
                onNotesChangedRef.current?.(notes);
                return notes;
            }
            return [];
        },
        getCurrentNotes: () => {
            return extractCurrentCursorNotes();
        },
        getStepDuration: () => {
            return extractCursorData(osmdRef.current?.cursor).stepDuration;
        }
    }), [extractCurrentCursorNotes]);

    useEffect(() => {
        if (!containerRef.current) return;

        setIsLoading(true);
        setError(null);

        containerRef.current.innerHTML = '';

        try {
            const osmd = new OpenSheetMusicDisplay(containerRef.current, {
                autoResize: true,
                drawTitle: true,
                drawSubtitle: false,
                drawComposer: true,
                drawingParameters: 'compact',
                followCursor: true,
            });

            osmdRef.current = osmd;

            osmd.load(xmlContent)
                .then(() => {
                    osmd.zoom = zoom;
                    osmd.render();
                    osmd.cursor.show();
                    const initialNotes = extractCurrentCursorNotes();
                    onNotesChangedRef.current?.(initialNotes);

                    const detectedBpm = osmd.Sheet?.DefaultStartTempoInBpm || osmd.cursor?.Iterator?.CurrentBpm;
                    if (detectedBpm && detectedBpm > 0) {
                        onBpmDetectedRef.current?.(Math.round(detectedBpm));
                    }

                    setIsLoading(false);
                })
                .catch((err: unknown) => {
                    console.error('[SheetMusicViewer] Error loading MusicXML:', err);
                    setError(t('games.melodiq_notes.error_loading_sheet'));
                    setIsLoading(false);
                });

        } catch (err) {
            console.error('[SheetMusicViewer] Error initializing OSMD:', err);
            setError(t('games.melodiq_notes.error_init_sheet'));
            setIsLoading(false);
        }

        return () => {
            if (osmdRef.current) {
                try {
                    osmdRef.current.clear();
                } catch {
                    // Ignore cleanup errors
                }
            }
        };
    }, [xmlContent, zoom, extractCurrentCursorNotes, t]);

    return (
        <Box sx={{ position: 'relative', width: '100%', my: 2 }}>
            {isLoading && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6 }}>
                    <CircularProgress size={48} />
                    <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                        {t('games.melodiq_notes.loading_sheet')}
                    </Typography>
                </Box>
            )}

            {error && (
                <Box sx={{ p: 3, textAlign: 'center', color: 'error.main' }}>
                    <Typography variant="body1">{error}</Typography>
                </Box>
            )}

            {/* Scrollable sheet music container */}
            <Box
                sx={{
                    width: '100%',
                    maxHeight: '60vh',
                    overflowY: 'auto',
                    overflowX: 'auto',
                    display: isLoading ? 'none' : 'block',
                    background: '#ffffff',
                    borderRadius: 2,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    // Thin scrollbar on Webkit browsers
                    '&::-webkit-scrollbar': { width: 6, height: 6 },
                    '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.25)', borderRadius: 3 },
                }}
            >
                <Box
                    ref={containerRef}
                    sx={{ p: 2 }}
                />
            </Box>
        </Box>
    );
});

SheetMusicViewer.displayName = 'SheetMusicViewer';
