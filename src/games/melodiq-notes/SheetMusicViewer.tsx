import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Box, CircularProgress, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import type { CursorNotesResult, SheetMusicViewerRef, SheetMusicViewerProps } from './types';
import { extractCursorData } from './logic/cursorNotes';

export type { SheetMusicViewerRef, SheetMusicViewerProps };

export const SheetMusicViewer = forwardRef<SheetMusicViewerRef, SheetMusicViewerProps>(({
    xmlContent,
    selectedPartId,
    soloInstrumentInSheet = false,
    zoom = 1.0,
    renderMode = 'vertical',
    isCurrentNoteHit = false,
    onRenderModeChange: _onRenderModeChange,
    onNotesChanged,
    onSongEnd,
    onBpmDetected
}, ref) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const containerRef = useRef<HTMLDivElement>(null);
    const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const onNotesChangedRef = useRef(onNotesChanged);
    onNotesChangedRef.current = onNotesChanged;
    const onSongEndRef = useRef(onSongEnd);
    onSongEndRef.current = onSongEnd;
    const onBpmDetectedRef = useRef(onBpmDetected);
    onBpmDetectedRef.current = onBpmDetected;
    const selectedPartIdRef = useRef(selectedPartId);
    selectedPartIdRef.current = selectedPartId;

    const extractCurrentData = useCallback((): CursorNotesResult => {
        return extractCursorData(osmdRef.current?.cursor, selectedPartIdRef.current);
    }, []);

    const updateCursorHighlight = useCallback((isHit: boolean) => {
        const cursorElement = osmdRef.current?.cursor?.cursorElement;
        if (cursorElement) {
            cursorElement.style.backgroundColor = isHit ? 'rgba(76, 175, 80, 0.5)' : 'rgba(33, 150, 243, 0.5)';
            cursorElement.style.transition = 'background-color 0.15s ease';
            cursorElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
    }, []);

    useEffect(() => {
        updateCursorHighlight(isCurrentNoteHit);
    }, [isCurrentNoteHit, updateCursorHighlight]);

    // Handle soloing active instrument or showing full score in OSMD
    useEffect(() => {
        const osmd = osmdRef.current;
        if (!osmd?.Sheet?.Instruments) return;
        let changed = false;
        osmd.Sheet.Instruments.forEach(inst => {
            const visible = soloInstrumentInSheet && selectedPartId && selectedPartId !== 'all'
                ? (inst.IdString === selectedPartId || inst.Name === selectedPartId)
                : true;
            if (inst.Visible !== visible) {
                inst.Visible = visible;
                changed = true;
            }
        });
        if (changed) { try { osmd.render(); } catch { /* ignore */ } }
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
            if (!cursor || cursor.iterator?.EndReached) {
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
            getCurrentNotes: extractCurrentData,
            getStepDuration: () => extractCurrentData().stepDuration,
        };
    }, [extractCurrentData]);

    useEffect(() => {
        if (!containerRef.current) return;
        setIsLoading(true);
        setError(null);
        containerRef.current.innerHTML = '';

        try {
            const osmd = new OpenSheetMusicDisplay(containerRef.current, {
                autoResize: true,
                drawTitle: false,
                drawSubtitle: false,
                drawComposer: false,
                drawingParameters: 'compact',
                followCursor: true,
                pageFormat: 'Endless',
                renderSingleHorizontalStaffline: renderMode === 'horizontal',
            });
            osmdRef.current = osmd;

            osmd.load(xmlContent)
                .then(() => {
                    osmd.zoom = isMobile ? zoom * 0.65 : zoom;
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
    }, [xmlContent, renderMode, isMobile, zoom, t]);

    return (
        <Box sx={{ position: 'relative', width: '100%', my: 1.5 }}>

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
                    maxHeight: renderMode === 'horizontal' ? (isMobile ? '200px' : '240px') : (isMobile ? 'none' : '60vh'),
                    overflowY: renderMode === 'horizontal' ? 'hidden' : (isMobile ? 'visible' : 'auto'),
                    overflowX: 'auto',
                    whiteSpace: renderMode === 'horizontal' ? 'nowrap' : 'normal',
                    display: isLoading ? 'none' : (renderMode === 'horizontal' ? 'flex' : 'block'),
                    alignItems: renderMode === 'horizontal' ? 'center' : 'flex-start',
                    background: '#ffffff',
                    borderRadius: 2.5,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                    '&::-webkit-scrollbar': { width: 6, height: 6 },
                    '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.25)', borderRadius: 3 },
                }}
            >
                <Box ref={containerRef} sx={{ p: { xs: 1, sm: 2 } }} />
            </Box>
        </Box>
    );
});

SheetMusicViewer.displayName = 'SheetMusicViewer';
