import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, useMediaQuery } from '@mui/material';
import { type SongWithNotes } from './PitchVisualizer';
import type { Note } from '../parser';

interface LyricsDisplayProps {
    song: SongWithNotes;
    audioRef: React.RefObject<HTMLAudioElement | null>;
    uiScale?: number;
}

interface LyricsLaneProps {
    notes: Note[];
    currentBeat: number;
    align?: 'left' | 'center' | 'right';
    color?: string;
    secondary?: boolean;
    scale?: number;
}

const LyricsLane: React.FC<LyricsLaneProps & { bpm: number }> = React.memo(({ notes, currentBeat, align = 'center', color, secondary, scale = 1.0, bpm }) => {
    // Group notes into lines
    const lines = useMemo(() => {
        const rawNotes = (notes || []) as Note[];
        const groups: Note[][] = [];
        let currentGroup: Note[] = [];

        for (const note of rawNotes) {
            if (note.type === '-') {
                if (currentGroup.length > 0) groups.push(currentGroup);
                currentGroup = [];
            } else {
                currentGroup.push(note);
            }
        }
        if (currentGroup.length > 0) groups.push(currentGroup);
        return groups;
    }, [notes]);

    // Find active line
    // Optimization: This runs every frame. Keeping it simple as N is small.
    const activeLineIndex = lines.findIndex((line, index) => {
        if (line.length === 0) return false;

        // Use a more generous window to keep the line "active" even after it finishes, until the next one starts
        // This allows us to handle the "post-line" logic (fade out / countdown) within the same "active" line context
        const firstStart = line[0].start;

        const nextLine = lines[index + 1];
        const nextStart = nextLine ? nextLine[0].start : Infinity;

        // Standard active: within the line's duration
        // Post-active: between this line end and next line start
        // Pre-active: slightly before start (moved to 50 beats for smoother anticipation if needed, kept at 20)
        return currentBeat >= (firstStart - 20) && currentBeat < nextStart;
    });

    const activeLine = activeLineIndex !== -1 ? lines[activeLineIndex] : null;
    const nextLine = activeLineIndex !== -1 ? lines[activeLineIndex + 1] : (lines.length > 0 ? lines[0] : undefined);

    const primaryColor = color || (secondary ? '#ff80ab' : '#00ffff'); // Pink for P2, Cyan for P1/Solo override

    // Logic for Fade Out & Countdown
    let opacity = 1;
    let showCountdown = false;
    let countdownValue = 0;

    const msPerBeat = 60000 / (bpm * 4);

    if (activeLine) {
        const lastNote = activeLine[activeLine.length - 1];
        const lineEndBeat = lastNote.start + lastNote.duration;

        if (currentBeat > lineEndBeat) {
            // Line has finished
            const timeSinceEnd = (currentBeat - lineEndBeat) * msPerBeat / 1000;

            if (timeSinceEnd > 3.0) {
                // Fade out text
                opacity = 0;

                // Check for Countdown
                if (nextLine) {
                    const nextStartBeat = nextLine[0].start;
                    const gapBeats = nextStartBeat - lineEndBeat;
                    const gapSeconds = gapBeats * msPerBeat / 1000;

                    const beatsUntilNext = nextStartBeat - currentBeat;
                    const secondsUntilNext = beatsUntilNext * msPerBeat / 1000;

                    if (gapSeconds >= 8.0) {
                        // Long Gap: Show Countdown
                        showCountdown = true;

                        const countdownSecs = Math.ceil(secondsUntilNext);
                        countdownValue = Math.max(0, countdownSecs);

                        if (countdownValue > 0) {
                            opacity = 1;
                        } else {
                            showCountdown = false;
                        }
                    } else {
                        // Short/Medium Gap: Fade back in 5 seconds before next line
                        if (secondsUntilNext <= 5.0) {
                            opacity = 1;
                        }
                    }
                }
            } else {
                if (timeSinceEnd > 2.5) {
                    opacity = 1 - ((timeSinceEnd - 2.5) / 0.5);
                    if (opacity < 0) opacity = 0;
                }
            }
        }
    } else {
        // No active line (Pre-Song or specific gap state)
        opacity = 0; // Default hidden

        // Check for Pre-Song Countdown or Preview
        if (nextLine) {
            const nextStartBeat = nextLine[0].start;
            const totalGapSeconds = nextStartBeat * msPerBeat / 1000; // Time from 0 to Start

            const secondsSinceStart = currentBeat * msPerBeat / 1000;
            const beatsUntilNext = nextStartBeat - currentBeat;
            const secondsUntilNext = beatsUntilNext * msPerBeat / 1000;

            if (totalGapSeconds >= 8.0) {
                // Long Intro: Countdown
                if (secondsSinceStart > 3.0) {
                    showCountdown = true;
                    const countdownSecs = Math.ceil(secondsUntilNext);
                    countdownValue = Math.max(0, countdownSecs);

                    if (countdownValue > 0) {
                        opacity = 1;
                    } else {
                        showCountdown = false;
                    }
                }
            } else {
                // Short Intro: Just show it if within 5 seconds (or start immediately if very short)
                if (secondsUntilNext <= 5.0) {
                    opacity = 1;
                }
            }
        }
    }

    // Link next line visibility to active line visibility
    // If we are fading out, fade out the preview too.
    // However, now the parent container handles the fade-out, so kids just sit tight.

    // activeLine logic handles opacity.

    // Also handle case where neither is active (gap or pre-song)
    const containerOpacity = (!activeLine && !nextLine) ? 0.5 : 1;

    return (
        <Box sx={{
            textAlign: align,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            width: '100%',
            alignItems: align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start'),
            opacity: containerOpacity
        }}>
            {/* Scoped Background Container ("The Field") */}
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0, // Gap between active and next
                px: 2,
                py: 1,
                borderRadius: 2,
                bgcolor: 'rgba(0,0,0,0.5)', // Always dark background
                width: 'fit-content',
                alignItems: align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start'),
                opacity: showCountdown ? 1 : opacity,
                transition: 'opacity 0.5s ease-out'
            }}>
                {/* Active Line / Countdown */}
                <Box sx={{
                    display: 'flex',
                    justifyContent: align,
                    gap: '4px',
                    flexWrap: 'wrap',
                    minHeight: '40px'
                }}>
                    {showCountdown ? (
                        <Typography
                            variant="h4"
                            sx={{
                                fontSize: {
                                    xs: `${2.0 * scale}rem`,
                                    md: `${3.0 * scale}rem`,
                                    lg: `${3.5 * scale}rem`,
                                },
                                fontWeight: 'bold',
                                color: primaryColor,
                                textShadow: `0 0 20px ${primaryColor}`,
                                animation: 'pulse 1s infinite'
                            }}
                        >
                            {countdownValue}
                        </Typography>
                    ) : (
                        activeLine ? activeLine.map((note, idx) => {
                            const isPast = currentBeat >= (note.start + note.duration);
                            const isActive = currentBeat >= note.start && currentBeat < (note.start + note.duration);

                            const noteColor = isActive ? primaryColor : (isPast ? '#ffffff' : 'rgba(255,255,255,0.6)');

                            return (
                                <Typography
                                    key={idx}
                                    variant="h5"
                                    sx={{
                                        fontSize: {
                                            xs: `${3.0 * scale}rem`,
                                            md: `${4.5 * scale}rem`,
                                            lg: `${5.5 * scale}rem`,
                                        },
                                        fontWeight: isActive ? 'bold' : 'normal',
                                        color: noteColor,
                                        textShadow: isActive ? `0 0 10px ${primaryColor}` : 'none',
                                        transition: 'color 0.05s',
                                        whiteSpace: 'pre'
                                    }}
                                >
                                    {note.text}
                                </Typography>
                            );
                        }) : (
                            <Typography variant="h6" color="gray">...</Typography>
                        )
                    )}
                </Box>

                {/* Next Line Preview */}
                {nextLine && (
                    <Box sx={{
                        display: 'flex',
                        justifyContent: align,
                        gap: '4px',
                        flexWrap: 'wrap',
                        mt: 0.5,
                        opacity: 0.6 // Relative to parent
                    }}>
                        {nextLine.map((note, idx) => (
                            <Typography
                                key={idx}
                                variant="body1"
                                sx={{
                                    fontSize: {
                                        xs: `${1.5 * scale}rem`,
                                        md: `${2.0 * scale}rem`,
                                        lg: `${2.5 * scale}rem`,
                                    },
                                    color: 'rgba(255,255,255,0.8)', // Slightly brighter since background is dark
                                    fontWeight: 'light',
                                    whiteSpace: 'pre'
                                }}
                            >
                                {note.text}
                            </Typography>
                        ))}
                    </Box>
                )}
            </Box>
        </Box>
    );
});

export const LyricsDisplay: React.FC<LyricsDisplayProps> = React.memo(({ song, audioRef, uiScale = 1.0 }) => {
    const [currentBeat, setCurrentBeat] = useState(0);

    // Calculate BPM once or memoize it to pass down safely
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

    // Use media query for mobile/small screens
    const isSmallScreen = useMediaQuery('(max-width:600px), (max-height:500px)');

    return (
        <Box sx={{
            py: isSmallScreen ? 0.5 : 2,
            minHeight: isSmallScreen ? 60 : 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            flexDirection: isDuet ? 'row' : 'column' // Duets: left/right, Solo: centered column
        }}>
            {isDuet ? (
                // Duet View: Split 50/50
                <>
                    <Box sx={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                        <LyricsLane
                            notes={song.tracks![0].notes}
                            currentBeat={currentBeat}
                            align="right"
                            color="#40c4ff" // Blue
                            scale={uiScale}
                            bpm={bpm}
                        />
                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', pr: 2, mt: 0.5, color: '#40c4ff', opacity: 0.5, fontSize: isSmallScreen ? '0.65rem' : '0.75rem' }}>
                            {song.tracks![0].name || "Player 1"}
                        </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <LyricsLane
                            notes={song.tracks![1].notes}
                            currentBeat={currentBeat}
                            align="left"
                            color="#ff4081" // Pink
                            secondary
                            scale={uiScale}
                            bpm={bpm}
                        />
                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'left', pl: 2, mt: 0.5, color: '#ff4081', opacity: 0.5, fontSize: isSmallScreen ? '0.65rem' : '0.75rem' }}>
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
                    bpm={bpm}
                />
            )}
        </Box>
    );
});
