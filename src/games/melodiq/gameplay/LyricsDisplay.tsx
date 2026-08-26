import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, useMediaQuery } from '@mui/material';
import { type SongWithNotes } from './PitchVisualizer';
import type { Note } from '../parser';

interface LyricsDisplayProps {
    song: SongWithNotes;
    audioRef: React.RefObject<HTMLAudioElement | null>;
    uiScale?: number;
    enableZoom?: boolean;
}

interface LineGroup {
    notes: Note[];
    startBeat: number;
    endBeat: number;
}

interface LeadInIndicatorProps {
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
const LeadInIndicator: React.FC<LeadInIndicatorProps> = React.memo(({
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

interface LyricsLineProps {
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
const LyricsLine: React.FC<LyricsLineProps> = React.memo(({
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
                whiteSpace: 'pre-wrap',
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

interface LyricsLaneProps {
    notes: Note[];
    currentBeat: number;
    align?: 'left' | 'center' | 'right';
    color?: string;
    secondary?: boolean;
    scale?: number;
    enableZoom?: boolean;
    bpm: number;
}

const LINGER_SECONDS = 0.8; // Duration the completed line stays visible before advancing to next line

const LyricsLane: React.FC<LyricsLaneProps> = React.memo(({
    notes,
    currentBeat,
    align = 'center',
    color,
    secondary,
    scale = 1.0,
    enableZoom = false,
    bpm
}) => {
    // Group notes into line objects with pre-calculated bounds
    const lines = useMemo<LineGroup[]>(() => {
        const rawNotes = (notes || []) as Note[];
        const groups: LineGroup[] = [];
        let currentGroup: Note[] = [];

        const pushGroup = (grp: Note[]) => {
            if (grp.length === 0) return;
            const firstNote = grp[0];
            const lastNote = grp[grp.length - 1];
            groups.push({
                notes: grp,
                startBeat: firstNote.start,
                endBeat: lastNote.start + lastNote.duration
            });
        };

        for (const note of rawNotes) {
            if (note.type === '-') {
                if (currentGroup.length > 0) {
                    pushGroup(currentGroup);
                    currentGroup = [];
                }
            } else {
                currentGroup.push(note);
            }
        }
        if (currentGroup.length > 0) {
            pushGroup(currentGroup);
        }
        return groups;
    }, [notes]);

    const msPerBeat = 60000 / (bpm * 4);
    const lingerBeats = (LINGER_SECONDS * 1000) / msPerBeat;

    // Determine active line index:
    // Line 0 is active from start until its endBeat + lingerBeats.
    // Subsequent Line i is active immediately after Line i-1 reaches (endBeat + lingerBeats).
    const activeLineIndex = useMemo(() => {
        if (lines.length === 0) return -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineEndWithLinger = line.endBeat + lingerBeats;

            if (currentBeat <= lineEndWithLinger) {
                return i;
            }
        }
        return -1; // Song lyrics complete
    }, [lines, currentBeat, lingerBeats]);

    const activeLine = activeLineIndex !== -1 ? lines[activeLineIndex] : null;
    const nextLine = activeLineIndex !== -1 && activeLineIndex + 1 < lines.length
        ? lines[activeLineIndex + 1]
        : null;

    const primaryColor = color || (secondary ? '#ff80ab' : '#00ffff');

    // Lead-in timing calculation
    let timeUntilStartSec = 0;
    let totalGapSec = 0;

    if (activeLine) {
        timeUntilStartSec = (activeLine.startBeat - currentBeat) * msPerBeat / 1000;
        if (activeLineIndex === 0) {
            totalGapSec = activeLine.startBeat * msPerBeat / 1000;
        } else {
            const prevLine = lines[activeLineIndex - 1];
            totalGapSec = (activeLine.startBeat - prevLine.endBeat) * msPerBeat / 1000;
        }
    }

    return (
        <Box sx={{
            textAlign: align,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            alignItems: align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start')
        }}>
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                px: { xs: 1.5, md: 3 },
                py: { xs: 0.5, md: 1 },
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                alignItems: align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start')
            }}>
                {/* Lead-in Indicator / Countdown */}
                <LeadInIndicator
                    timeUntilStartSec={timeUntilStartSec}
                    totalGapSec={totalGapSec}
                    primaryColor={primaryColor}
                    scale={scale}
                    align={align}
                />

                {/* Active Line (Zeile 1 / Groß) */}
                <Box sx={{
                    minHeight: {
                        xs: `${2.8 * scale}rem`,
                        md: `${3.5 * scale}rem`,
                        lg: `${4.2 * scale}rem`
                    },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start'),
                    textAlign: align,
                    width: '100%'
                }}>
                    {activeLine ? (
                        <LyricsLine
                            line={activeLine}
                            currentBeat={currentBeat}
                            primaryColor={primaryColor}
                            align={align}
                            scale={scale}
                            enableZoom={enableZoom}
                        />
                    ) : (
                        <Typography
                            component="div"
                            sx={{
                                color: 'rgba(255,255,255,0.3)',
                                fontStyle: 'italic',
                                fontSize: { xs: `${1.1 * scale}rem`, md: `${1.3 * scale}rem` },
                                textAlign: align
                            }}
                        >
                            ♪ ♫ ♪
                        </Typography>
                    )}
                </Box>

                {/* Next Line Preview (Zeile 2 / Dezent) */}
                <Box sx={{
                    minHeight: {
                        xs: `${1.4 * scale}rem`,
                        md: `${1.8 * scale}rem`,
                        lg: `${2.2 * scale}rem`
                    },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start'),
                    width: '100%',
                    mt: 0.5
                }}>
                    {nextLine && (
                        <Typography
                            component="div"
                            sx={{
                                textAlign: align,
                                lineHeight: 1.3,
                                fontSize: {
                                    xs: `${0.95 * scale}rem`,
                                    md: `${1.2 * scale}rem`,
                                    lg: `${1.4 * scale}rem`,
                                },
                                fontWeight: 500,
                                color: 'rgba(255,255,255,0.85)',
                                opacity: 0.65,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                width: '100%'
                            }}
                        >
                            {nextLine.notes.map((note, idx) => (
                                <Box
                                    key={idx}
                                    component="span"
                                    sx={{
                                        display: 'inline-block',
                                        whiteSpace: 'pre',
                                        textShadow: '0 2px 5px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)'
                                    }}
                                >
                                    {note.text}
                                </Box>
                            ))}
                        </Typography>
                    )}
                </Box>
            </Box>
        </Box>
    );
});
LyricsLane.displayName = 'LyricsLane';

export const LyricsDisplay: React.FC<LyricsDisplayProps> = React.memo(({
    song,
    audioRef,
    uiScale = 1.0,
    enableZoom = false
}) => {
    const [currentBeat, setCurrentBeat] = useState(0);

    const bpm = song.bpm || 120;

    useEffect(() => {
        let frameId: number;
        const loop = () => {
            if (audioRef.current) {
                const currentTime = audioRef.current.currentTime;
                const gap = song.gap || 0;
                const bpmMultiplier = 4;
                const beatDuration = 60000 / (bpm * bpmMultiplier);
                const beat = (currentTime * 1000 - gap) / beatDuration;
                setCurrentBeat(beat);
            }
            frameId = requestAnimationFrame(loop);
        };
        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [song, audioRef, bpm]);

    const isDuet = song.tracks && song.tracks.length > 1;
    const isSmallScreen = useMediaQuery('(max-width:600px), (max-height:500px)');

    return (
        <Box sx={{
            py: isSmallScreen ? 0.5 : 1.5,
            minHeight: isSmallScreen ? 60 : 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            flexDirection: isDuet ? 'row' : 'column' // Duets: 50/50 split, Solo: centered column
        }}>
            {isDuet ? (
                // Duet View: Unified 50/50 split with centered alignment for both players
                <>
                    <Box sx={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.12)', px: { xs: 1, md: 2 } }}>
                        <LyricsLane
                            notes={song.tracks![0].notes}
                            currentBeat={currentBeat}
                            align="center"
                            color="#40c4ff" // Blue / Cyan
                            scale={uiScale}
                            enableZoom={enableZoom}
                            bpm={bpm}
                        />
                        <Typography
                            variant="caption"
                            sx={{
                                display: 'block',
                                textAlign: 'center',
                                mt: 0.5,
                                color: '#40c4ff',
                                opacity: 0.65,
                                fontWeight: 600,
                                fontSize: isSmallScreen ? '0.65rem' : '0.75rem',
                                letterSpacing: '0.04em'
                            }}
                        >
                            {song.tracks![0].name || "Player 1"}
                        </Typography>
                    </Box>
                    <Box sx={{ flex: 1, px: { xs: 1, md: 2 } }}>
                        <LyricsLane
                            notes={song.tracks![1].notes}
                            currentBeat={currentBeat}
                            align="center"
                            color="#ff4081" // Pink / Magenta
                            secondary
                            scale={uiScale}
                            enableZoom={enableZoom}
                            bpm={bpm}
                        />
                        <Typography
                            variant="caption"
                            sx={{
                                display: 'block',
                                textAlign: 'center',
                                mt: 0.5,
                                color: '#ff4081',
                                opacity: 0.65,
                                fontWeight: 600,
                                fontSize: isSmallScreen ? '0.65rem' : '0.75rem',
                                letterSpacing: '0.04em'
                            }}
                        >
                            {song.tracks![1].name || "Player 2"}
                        </Typography>
                    </Box>
                </>
            ) : (
                // Solo View
                <LyricsLane
                    notes={(song.tracks && song.tracks.length > 0) ? song.tracks[0].notes : (song.notes || [])}
                    currentBeat={currentBeat}
                    align="center"
                    scale={uiScale}
                    enableZoom={enableZoom}
                    bpm={bpm}
                />
            )}
        </Box>
    );
});
LyricsDisplay.displayName = 'LyricsDisplay';
