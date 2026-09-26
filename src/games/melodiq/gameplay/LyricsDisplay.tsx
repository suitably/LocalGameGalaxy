import React, { useState, useEffect, useMemo } from 'react';
import { LyricsLine, LeadInIndicator, type LineGroup } from './LyricsLineView';
import { Box, Typography, useMediaQuery } from '@mui/material';
import { type SongWithNotes } from './PitchVisualizer';
import type { Note } from '../parser';

export interface LyricsDisplayProps {
    song: SongWithNotes;
    audioRef: React.RefObject<HTMLAudioElement | null>;
    uiScale?: number;
    enableZoom?: boolean;
    lyricsLines?: number;
}

export interface LyricsLaneProps {
    notes: Note[];
    currentBeat: number;
    align?: 'left' | 'center' | 'right';
    color?: string;
    secondary?: boolean;
    scale?: number;
    enableZoom?: boolean;
    lyricsLines?: number;
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
    lyricsLines = 2,
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

    // Determine upcoming lines based on lyricsLines setting
    const numUpcoming = Math.max(0, lyricsLines - 1);
    const upcomingLines: LineGroup[] = [];
    if (activeLineIndex !== -1) {
        for (let i = 1; i <= numUpcoming; i++) {
            if (activeLineIndex + i < lines.length) {
                upcomingLines.push(lines[activeLineIndex + i]);
            }
        }
    }

    const primaryColor = color || (secondary ? '#ff80ab' : '#00ffff');

    if (lyricsLines === 0) {
        return <Box sx={{ width: '100%', minHeight: { xs: 60, md: 120 } }} />;
    }

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

                {/* Upcoming Lines Preview */}
                {upcomingLines.map((line, lineIdx) => {
                    const baseOpacity = 0.65;
                    const opacityDrop = 0.25;
                    const currentOpacity = Math.max(0.1, baseOpacity - (lineIdx * opacityDrop));

                    return (
                        <Box key={lineIdx} sx={{
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
                                    opacity: currentOpacity,
                                    whiteSpace: 'nowrap',
                                    width: '100%'
                                }}
                            >
                                {line.notes.map((note, idx) => (
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
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
});
LyricsLane.displayName = 'LyricsLane';

export const LyricsDisplay: React.FC<LyricsDisplayProps> = React.memo(({
    song,
    audioRef,
    uiScale = 1.0,
    enableZoom = false,
    lyricsLines = 2
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
                            lyricsLines={lyricsLines}
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
                            lyricsLines={lyricsLines}
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
                    lyricsLines={lyricsLines}
                    bpm={bpm}
                />
            )}
        </Box>
    );
});
LyricsDisplay.displayName = 'LyricsDisplay';
