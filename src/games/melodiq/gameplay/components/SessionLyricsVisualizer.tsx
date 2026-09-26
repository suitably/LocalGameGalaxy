import React from 'react';
import { Box, Button } from '@mui/material';
import { LyricsDisplay } from '../LyricsDisplay';
import { PitchVisualizer, type SongWithNotes } from '../PitchVisualizer';
import { type PlayerRuntime } from '../hooks/PlayerRuntime';

export interface SessionLyricsVisualizerProps {
    visiblePlayers: PlayerRuntime[];
    allPlayers: PlayerRuntime[];
    parsedSong: SongWithNotes;
    timeProxyRef: React.RefObject<any>;
    lyricsUiScale: number;
    activeLyricsZoom: boolean;
    activeLyricsLines?: number;
    activeLyricsPosition: 'bottom' | 'center';
    gridLayout: { rows: number[]; columnWidthPercent: number };
    showDebugOverlay?: boolean;
    showNoteLabels?: boolean;
    uiScale?: number;
    onSwitchTrack: (playerIndex: number, trackIndex: number) => void;
}

export const SessionLyricsVisualizer: React.FC<SessionLyricsVisualizerProps> = ({
    visiblePlayers,
    allPlayers,
    parsedSong,
    timeProxyRef,
    lyricsUiScale,
    activeLyricsZoom,
    activeLyricsLines,
    activeLyricsPosition,
    gridLayout,
    showDebugOverlay,
    showNoteLabels,
    uiScale = 1.0,
    onSwitchTrack
}) => {
    if (visiblePlayers.length === 0) {
        if (activeLyricsPosition === 'center') {
            return (
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 0,
                        overflow: 'hidden',
                        px: { xs: 2, md: 6 }
                    }}
                >
                    <Box sx={{ width: '100%', maxWidth: '1400px' }}>
                        <LyricsDisplay
                            song={parsedSong}
                            audioRef={timeProxyRef}
                            uiScale={lyricsUiScale * 1.45}
                            enableZoom={activeLyricsZoom}
                            lyricsLines={activeLyricsLines}
                        />
                    </Box>
                </Box>
            );
        }

        return (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                <Box sx={{ flex: 1 }} />
                <Box
                    sx={{
                        flexShrink: 0,
                        width: '100%',
                        pointerEvents: 'none',
                        zIndex: 10,
                        borderTop: '1px solid rgba(255,255,255,0.12)',
                        bgcolor: 'rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(8px)',
                        position: 'relative',
                        display: 'flex',
                        justifyContent: 'center'
                    }}
                >
                    <Box sx={{ width: '100%', maxWidth: '1400px' }}>
                        <LyricsDisplay
                            song={parsedSong}
                            audioRef={timeProxyRef}
                            uiScale={lyricsUiScale}
                            enableZoom={activeLyricsZoom}
                            lyricsLines={activeLyricsLines}
                        />
                    </Box>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <Box sx={{ flex: 1, display: 'flex', flexWrap: 'wrap', minHeight: 0, alignContent: 'stretch' }}>
                {visiblePlayers.map((player, idx) => {
                    let remaining = idx;
                    let rowIndex = 0;
                    let colIndex = 0;
                    let colsInRow = 1;
                    for (let i = 0; i < gridLayout.rows.length; i++) {
                        if (remaining < gridLayout.rows[i]) {
                            rowIndex = i;
                            colIndex = remaining;
                            colsInRow = gridLayout.rows[i];
                            break;
                        }
                        remaining -= gridLayout.rows[i];
                    }

                    const widthPercent = 100 / colsInRow;
                    const heightPercent = 100 / gridLayout.rows.length;

                    return (
                        <Box
                            key={player.config.id}
                            sx={{
                                width: `${widthPercent}%`,
                                height: `${heightPercent}%`,
                                minHeight: 0,
                                position: 'relative',
                                borderRight: colIndex < colsInRow - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none',
                                borderBottom: rowIndex < gridLayout.rows.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none'
                            }}
                        >
                            <PitchVisualizer
                                song={parsedSong}
                                audioRef={timeProxyRef}
                                currentPitchRef={player.pitchRef}
                                sungSegmentsRef={player.segmentsRef}
                                showDebugOverlay={showDebugOverlay}
                                label={player.config.name}
                                hue={player.config.hue}
                                showNoteLabels={showNoteLabels}
                                latency={player.config.latency}
                                trackIndex={player.trackIndex}
                                scale={uiScale}
                            />
                            {parsedSong.tracks && parsedSong.tracks.length > 1 && (
                                <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 10, pointerEvents: 'auto' }}>
                                    <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', borderRadius: 1, p: 0.5, display: 'flex', gap: 0.5 }}>
                                        {parsedSong.tracks.map((t: any, tIdx: number) => (
                                            <Button
                                                key={tIdx}
                                                variant={player.trackIndex === tIdx ? 'contained' : 'text'}
                                                size="small"
                                                sx={{
                                                    minWidth: 30,
                                                    p: '2px 8px',
                                                    fontSize: '0.75rem',
                                                    bgcolor: player.trackIndex === tIdx ? `hsl(${player.config.hue}, 80%, 40%)` : 'transparent',
                                                    color: 'white',
                                                    '&:hover': {
                                                        bgcolor: player.trackIndex === tIdx ? `hsl(${player.config.hue}, 80%, 50%)` : 'rgba(255,255,255,0.1)'
                                                    }
                                                }}
                                                onClick={() => onSwitchTrack(allPlayers.indexOf(player), tIdx)}
                                            >
                                                {t.name || `P${tIdx + 1}`}
                                            </Button>
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    );
                })}
            </Box>
            <Box
                sx={{
                    flexShrink: 0,
                    width: '100%',
                    pointerEvents: 'none',
                    zIndex: 10,
                    borderTop: '1px solid rgba(255,255,255,0.12)',
                    bgcolor: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(8px)',
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'center'
                }}
            >
                <Box sx={{ width: '100%', maxWidth: '1400px' }}>
                    <LyricsDisplay
                        song={parsedSong}
                        audioRef={timeProxyRef}
                        uiScale={lyricsUiScale}
                        enableZoom={activeLyricsZoom}
                        lyricsLines={activeLyricsLines}
                    />
                </Box>
            </Box>
        </Box>
    );
};
