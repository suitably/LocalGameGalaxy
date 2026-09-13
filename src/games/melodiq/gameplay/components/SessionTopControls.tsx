import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { ScoreDisplay, type ScoreDisplayHandle } from '../ScoreDisplay';
import { type PlayerRuntime } from '../hooks/PlayerRuntime';

export interface SessionTopControlsProps {
    artist: string;
    title: string;
    uiScale?: number;
    isTVMode?: boolean;
    onMinimize?: () => void;
    scoreDisplayRef: React.RefObject<ScoreDisplayHandle | null>;
    visiblePlayers: PlayerRuntime[];
    progressLineRef: React.RefObject<HTMLDivElement | null>;
    isUIVisible?: boolean;
}

export const SessionTopControls: React.FC<SessionTopControlsProps> = ({
    artist,
    title,
    uiScale = 1.0,
    isTVMode = false,
    onMinimize,
    scoreDisplayRef,
    visiblePlayers,
    progressLineRef,
    isUIVisible = true
}) => {
    return (
        <>
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    zIndex: 20,
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: 'rgba(0,0,0,0.5)',
                    pointerEvents: isUIVisible ? 'auto' : 'none',
                    opacity: isUIVisible ? 1 : 0,
                    transition: 'opacity 0.5s ease-in-out'
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {onMinimize && !isTVMode && (
                        <IconButton onClick={onMinimize} color="inherit" sx={{ ml: 1 }}>
                            <KeyboardArrowDownIcon />
                        </IconButton>
                    )}
                </Box>
                <Typography variant="h6" sx={{ fontSize: `${1.25 * uiScale}rem` }}>
                    {artist} - {title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 4, pointerEvents: 'none' }}>
                    <ScoreDisplay
                        ref={scoreDisplayRef}
                        players={visiblePlayers.map(p => ({ id: p.config.id, name: p.config.name, hue: p.config.hue }))}
                        scale={uiScale}
                    />
                </Box>
            </Box>

            <Box
                sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 6,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    zIndex: 100,
                    pointerEvents: 'none',
                    opacity: isUIVisible ? 1 : 0,
                    transition: 'opacity 0.5s ease-in-out'
                }}
            >
                <Box
                    ref={progressLineRef}
                    sx={{
                        width: '0%',
                        height: '100%',
                        background: 'linear-gradient(90deg, #ff4081 0%, #7c4dff 100%)',
                        boxShadow: '0 0 10px currentColor',
                        transition: 'width 0.1s linear'
                    }}
                />
            </Box>
        </>
    );
};
