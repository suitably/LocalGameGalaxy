import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Box, CircularProgress, Typography, IconButton, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useTranslation } from 'react-i18next';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import type { TargetNote } from './useNoteVerifier';
import { extractCursorData, type CursorNotesResult } from './logic/cursorNotes';

export interface SheetMusicViewerRef {
    nextNote: () => CursorNotesResult;
    previousNote: () => CursorNotesResult;
    resetCursor: () => CursorNotesResult;
    getCurrentNotes: () => CursorNotesResult;
    getStepDuration: () => number;
}

interface SheetMusicViewerProps {
    xmlContent: string;
    selectedPartId?: string;
    soloInstrumentInSheet?: boolean;
    isCurrentNoteHit?: boolean;
    onNotesChanged?: (targetNotes: TargetNote[], allCursorNotes: TargetNote[]) => void;
    onSongEnd?: () => void;
    onBpmDetected?: (bpm: number) => void;
}

export const SheetMusicViewer = forwardRef<SheetMusicViewerRef, SheetMusicViewerProps>(({
    xmlContent,
    selectedPartId,
    soloInstrumentInSheet = false,
    isCurrentNoteHit = false,
    onNotesChanged,
    onSongEnd,
    onBpmDetected
}, ref) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const containerRef = useRef<HTMLDivElement>(null);
    const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [currentZoom, setCurrentZoom] = useState<number>(1.0);

    const onNotesChangedRef = useRef(onNotesChanged);
    const onSongEndRef = useRef(onSongEnd);
    const onBpmDetectedRef = useRef(onBpmDetected);
    const selectedPartIdRef = useRef(selectedPartId);
    useEffect(() => {
        onNotesChangedRef.current = onNotesChanged;
        onSongEndRef.current = onSongEnd;
        onBpmDetectedRef.current = onBpmDetected;
        selectedPartIdRef.current = selectedPartId;
    });

    const extractCurrentData = useCallback((): CursorNotesResult => {
        return extractCursorData(osmdRef.current?.cursor, selectedPartIdRef.current);
    }, []);

    const updateCursorHighlight = useCallback((isHit: boolean) => {
        const cursorElement = osmdRef.current?.cursor?.cursorElement;
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

    // Handle soloing active instrument or showing full score in OSMD
    useEffect(() => {
        const osmd = osmdRef.current;
        if (!osmd || !osmd.Sheet || !osmd.Sheet.Instruments) return;

        let hasChanged = false;
        osmd.Sheet.Instruments.forEach(inst => {
            const shouldBeVisible = soloInstrumentInSheet && selectedPartId && selectedPartId !== 'all'
                ? (inst.IdString === selectedPartId || inst.Name === selectedPartId)
                : true;
            if (inst.Visible !== shouldBeVisible) {
                inst.Visible = shouldBeVisible;
                hasChanged = true;
            }
        });

        if (hasChanged) {
            try { osmd.render(); } catch { /* ignore */ }
        }
    }, [soloInstrumentInSheet, selectedPartId]);

    // Update targets on instrument change
    useEffect(() => {
        if (!osmdRef.current?.cursor) return;
        const current = extractCurrentData();
        onNotesChangedRef.current?.(current.targetNotes, current.allCursorNotes);
    }, [selectedPartId, extractCurrentData]);

    useImperativeHandle(ref, () => {
        const move = (step: () => void): CursorNotesResult => {
            const cursor = osmdRef.current?.cursor;
            if (!cursor) return { targetNotes: [], allCursorNotes: [], stepDuration: 0.25, isEndReached: true };
            if (cursor.iterator?.EndReached) {
                onSongEndRef.current?.();
                return { targetNotes: [], allCursorNotes: [], stepDuration: 0.25, isEndReached: true };
            }
            step();
            if (cursor.iterator?.EndReached) onSongEndRef.current?.();
            const data = extractCurrentData();
            onNotesChangedRef.current?.(data.targetNotes, data.allCursorNotes);
            return data;
        };

        return {
            nextNote: () => move(() => osmdRef.current?.cursor?.next()),
            previousNote: () => move(() => osmdRef.current?.cursor?.previous()),
            resetCursor: () => {
                const c = osmdRef.current?.cursor;
                if (c) { c.reset(); c.show(); }
                const data = extractCurrentData();
                onNotesChangedRef.current?.(data.targetNotes, data.allCursorNotes);
                return data;
            },
            getCurrentNotes: () => extractCurrentData(),
            getStepDuration: () => extractCurrentData().stepDuration,
        };
    }, [extractCurrentData]);

    const handleZoom = (delta: number) => {
        const next = Math.min(2.0, Math.max(0.6, Math.round((currentZoom + delta) * 10) / 10));
        setCurrentZoom(next);
        if (osmdRef.current) {
            osmdRef.current.zoom = next;
            try { osmdRef.current.render(); } catch {}
        }
    };

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
                    osmd.zoom = isMobile ? currentZoom * 0.65 : currentZoom;
                    osmd.render();
                    osmd.cursor.show();
                    const initial = extractCurrentData();
                    onNotesChangedRef.current?.(initial.targetNotes, initial.allCursorNotes);

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
                try { osmdRef.current.clear(); } catch { /* ignore */ }
            }
        };
    }, [xmlContent]);

    return (
        <Box sx={{ position: 'relative', width: '100%', my: 1.5 }}>
            {/* Zoom Controls Overlay */}
            {!isLoading && !error && (
                <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', gap: 0.5, bgcolor: 'rgba(0,0,0,0.65)', borderRadius: 2, p: 0.5 }}>
                    <Tooltip title={t('games.melodiq_notes.zoom_out', 'Verkleinern')}><IconButton size="small" onClick={() => handleZoom(-0.1)} sx={{ color: '#fff' }}><ZoomOutIcon fontSize="small" /></IconButton></Tooltip>
                    <Typography variant="caption" sx={{ color: '#fff', alignSelf: 'center', px: 0.5, fontSize: '0.75rem' }}>{Math.round(currentZoom * 100)}%</Typography>
                    <Tooltip title={t('games.melodiq_notes.zoom_in', 'Vergrößern')}><IconButton size="small" onClick={() => handleZoom(0.1)} sx={{ color: '#fff' }}><ZoomInIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title={t('games.melodiq_notes.zoom_reset', 'Reset')}><IconButton size="small" onClick={() => { setCurrentZoom(1.0); if (osmdRef.current) { osmdRef.current.zoom = 1.0; osmdRef.current.render(); } }} sx={{ color: '#fff' }}><RestartAltIcon fontSize="small" /></IconButton></Tooltip>
                </Box>
            )}

            {isLoading && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6 }}>
                    <CircularProgress size={48} />
                    <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>{t('games.melodiq_notes.loading_sheet')}</Typography>
                </Box>
            )}

            {error && (
                <Box sx={{ p: 3, textAlign: 'center', color: 'error.main' }}>
                    <Typography variant="body1">{error}</Typography>
                </Box>
            )}

            <Box
                sx={{
                    width: '100%',
                    maxHeight: isMobile ? 'none' : '60vh',
                    overflowY: isMobile ? 'visible' : 'auto',
                    overflowX: 'auto',
                    display: isLoading ? 'none' : 'block',
                    background: '#ffffff',
                    borderRadius: 2.5,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                    '&::-webkit-scrollbar': { width: 6, height: 6 },
                    '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.25)', borderRadius: 3 },
                }}
            >
                <Box ref={containerRef} sx={{ p: 2 }} />
            </Box>
        </Box>
    );
});

SheetMusicViewer.displayName = 'SheetMusicViewer';
