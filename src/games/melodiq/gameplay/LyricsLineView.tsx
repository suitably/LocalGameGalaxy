import React from 'react';
import { Box, Typography } from '@mui/material';
import type { Note } from '../parser';

export interface LineGroup {
    notes: Note[];
    startBeat: number;
    endBeat: number;
}

export interface LeadInIndicatorProps {
    timeUntilStartSec: number;
    totalGapSec: number;
    primaryColor: string;
    scale?: number;
    align?: 'left' | 'center' | 'right';
}

/**
 * Renders a beat-accurate, non-intrusive countdown indicator:
 * - When approaching singing start (<= 3.0s): 3 rhythmic beat dots (● ● ●).
 * - During long instrumental breaks (> 3.0s remaining, gap >= 5.0s): A sleek pause badge.
 * Lyrics text is NEVER hidden or replaced by this indicator.
 */
export const LeadInIndicator: React.FC<LeadInIndicatorProps> = React.memo(({
    timeUntilStartSec,
    totalGapSec,
    primaryColor,
    scale = 1.0,
    align = 'center',
}) => {
    if (timeUntilStartSec <= 0 || totalGapSec < 2.5) {
        return <Box sx={{ height: `${1.2 * scale}rem` }} />;
    }

    const isCountdownActive = timeUntilStartSec <= 3.0;
    const isLongBreak = timeUntilStartSec > 3.0 && totalGapSec >= 5.0;

    return (
        <Box sx={{
            height: `${1.2 * scale}rem`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start'),
            gap: 1,
            mb: 0.25,
            transition: 'opacity 0.2s ease-in-out',
            opacity: (isCountdownActive || isLongBreak) ? 1 : 0
        }}>
            {isCountdownActive ? (
                // 3 Lead-In Countdown Dots
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {[3, 2, 1].map((step) => {
                        const isLit = timeUntilStartSec <= step;
                        return (
                            <Box
                                key={step}
                                sx={{
                                    width: `${0.65 * scale}rem`,
                                    height: `${0.65 * scale}rem`,
                                    borderRadius: '50%',
                                    bgcolor: isLit ? primaryColor : 'rgba(255,255,255,0.25)',
                                    boxShadow: isLit ? `0 0 12px ${primaryColor}, 0 0 4px #ffffff` : 'none',
                                    transform: isLit ? 'scale(1.2)' : 'scale(1.0)',
                                    transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                }}
                            />
                        );
                    })}
                </Box>
            ) : isLongBreak ? (
                // Sleek Instrumental Pause Badge
                <Box sx={{
                    px: 1.2,
                    py: 0.2,
                    borderRadius: 3,
                    bgcolor: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                }}>
                    <Typography
                        variant="caption"
                        sx={{
                            fontSize: `${0.75 * scale}rem`,
                            color: 'rgba(255,255,255,0.85)',
                            fontWeight: 600,
                            letterSpacing: '0.04em'
                        }}
                    >
                        ♪ In {Math.ceil(timeUntilStartSec)}s
                    </Typography>
                </Box>
            ) : null}
        </Box>
    );
});
LeadInIndicator.displayName = 'LeadInIndicator';

export interface LyricsLineProps {
    line: LineGroup;
    currentBeat: number;
    primaryColor: string;
    align: 'left' | 'center' | 'right';
    scale: number;
    enableZoom: boolean;
}

/**
 * Renders the active singing line with real-time syllable highlighting.
 */
export const LyricsLine: React.FC<LyricsLineProps> = React.memo(({
    line,
    currentBeat,
    primaryColor,
    align,
    scale,
    enableZoom
}) => {
    return (
        <Typography
            component="div"
            sx={{
                textAlign: align,
                lineHeight: 1.3,
                fontSize: {
                    xs: `${1.35 * scale}rem`,
                    md: `${1.75 * scale}rem`,
                    lg: `${2.25 * scale}rem`,
                },
                fontWeight: 700, // Constant weight guarantees zero font metric layout shift
                whiteSpace: 'nowrap',
                wordBreak: 'break-word',
                width: '100%'
            }}
        >
            {line.notes.map((note, idx) => {
                const noteEnd = note.start + note.duration;
                const isPast = currentBeat >= noteEnd;
                const isActive = currentBeat >= note.start && currentBeat < noteEnd;
                const noteColor = isActive ? primaryColor : (isPast ? '#ffffff' : 'rgba(255,255,255,0.72)');
                const baseShadow = '0 2px 6px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.8)';
                const activeGlow = `0 0 16px ${primaryColor}, 0 0 32px ${primaryColor}, 0 2px 6px rgba(0,0,0,0.9)`;

                return (
                    <Box
                        key={idx}
                        component="span"
                        sx={{
                            display: 'inline-block',
                            color: noteColor,
                            textShadow: isActive ? activeGlow : baseShadow,
                            filter: (enableZoom && isActive) ? 'brightness(1.25)' : 'none',
                            transition: 'color 0.05s ease-out, text-shadow 0.05s ease-out, filter 0.05s ease-out',
                            whiteSpace: 'pre'
                        }}
                    >
                        {note.text}
                    </Box>
                );
            })}
        </Typography>
    );
});
LyricsLine.displayName = 'LyricsLine';
