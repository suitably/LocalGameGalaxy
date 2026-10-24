import React, { useState, useEffect } from 'react';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import { type SongWithNotes } from './PitchVisualizer';
import { LyricsLane } from './lyrics/LyricsLane';

export interface LyricsDisplayProps {
  song: SongWithNotes;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  uiScale?: number;
  enableZoom?: boolean;
  lyricsLines?: number;
}

/** Current song position in beats, sampled every animation frame. */
const useCurrentBeat = (
  audioRef: React.RefObject<HTMLAudioElement | null>,
  gap: number,
  bpm: number,
): number => {
  const [currentBeat, setCurrentBeat] = useState(0);

  useEffect(() => {
    let frameId: number;
    const beatDuration = 60000 / (bpm * 4);
    const loop = () => {
      if (audioRef.current) {
        setCurrentBeat((audioRef.current.currentTime * 1000 - gap) / beatDuration);
      }
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [audioRef, gap, bpm]);

  return currentBeat;
};

export const LyricsDisplay: React.FC<LyricsDisplayProps> = React.memo(
  ({ song, audioRef, uiScale = 1.0, enableZoom = false, lyricsLines = 2 }) => {
    const theme = useTheme();
    const bpm = song.bpm || 120;
    const currentBeat = useCurrentBeat(audioRef, song.gap || 0, bpm);

    const isDuet = !!song.tracks && song.tracks.length > 1;
    const isSmallScreen = useMediaQuery('(max-width:600px), (max-height:500px)');
    // Singer colours come from the piece palette: solo = teal, duet = blue / pink.
    const { piece } = theme.palette;

    const laneProps = { currentBeat, scale: uiScale, enableZoom, lyricsLines, bpm } as const;

    return (
      <Box
        sx={{
          py: isSmallScreen ? 0.5 : 1.5,
          minHeight: isSmallScreen ? 60 : 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          flexDirection: isDuet ? 'row' : 'column', // Duets: 50/50 split, Solo: centered column
        }}
      >
        {isDuet ? (
          [
            { track: song.tracks![0], color: piece.blue, fallback: 'Player 1' },
            { track: song.tracks![1], color: piece.pink, fallback: 'Player 2' },
          ].map(({ track, color, fallback }, idx) => (
            <Box
              key={idx}
              sx={{
                flex: 1,
                px: { xs: 1, md: 2 },
                ...(idx === 0 && { borderRight: 1, borderColor: 'divider' }),
              }}
            >
              <LyricsLane notes={track.notes} color={color} align="center" {...laneProps} />
              {/* Track name pairs with the lane colour, so colour is never the only signal. */}
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  textAlign: 'center',
                  mt: 0.5,
                  color,
                  fontSize: isSmallScreen ? '0.75rem' : '0.875rem',
                }}
              >
                {track.name || fallback}
              </Typography>
            </Box>
          ))
        ) : (
          <LyricsLane
            notes={song.tracks && song.tracks.length > 0 ? song.tracks[0].notes : song.notes || []}
            color={piece.teal}
            align="center"
            {...laneProps}
          />
        )}
      </Box>
    );
  },
);
LyricsDisplay.displayName = 'LyricsDisplay';
