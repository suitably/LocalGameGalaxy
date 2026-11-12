import React, { useEffect, useMemo, useState } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { type SongWithNotes } from './PitchVisualizer';
import { LyricsLane } from './lyrics/LyricsLane';
import { useSongLyricsFit } from './lyrics/useSongLyricsFit';
import { useLyricsPartChoice } from './lyrics/LyricsPartContext';
import { PartMicButton } from './lyrics/PartMicButton';
import { DuetPart } from './lyrics/DuetPart';
import { useStackedStage } from './hooks/useStackedStage';
import { DEFAULT_LYRICS_MIN_FIT, type LyricsRows } from './logic/lyricsFit';

export interface LyricsDisplayProps {
  song: SongWithNotes;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  uiScale?: number;
  enableZoom?: boolean;
  lyricsLines?: number;
  lyricsRows?: LyricsRows;
  /** Smallest font factor; a longer line wraps instead. */
  lyricsMinFit?: number;
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
  ({
    song,
    audioRef,
    uiScale = 1.0,
    enableZoom = false,
    lyricsLines = 2,
    lyricsRows = 2,
    lyricsMinFit = DEFAULT_LYRICS_MIN_FIT,
  }) => {
    const theme = useTheme();
    const { t } = useTranslation();
    const bpm = song.bpm || 120;
    const currentBeat = useCurrentBeat(audioRef, song.gap || 0, bpm);

    const isDuet = !!song.tracks && song.tracks.length > 1;
    const isSmallScreen = useMediaQuery('(max-width:600px), (max-height:500px)');
    const stacked = useStackedStage();
    // Singer colours come from the piece palette: solo = teal, duet = blue / pink.
    const { piece } = theme.palette;
    // Phones only: a mic per part to pick it, or to join the song while watching.
    const partChoice = useLyricsPartChoice();
    const trackCount = song.tracks?.length ?? 1;

    const trackNotes = useMemo(() => {
      if (song.tracks && song.tracks.length > 0) return song.tracks.map((track) => track.notes);
      return [song.notes || []];
    }, [song.tracks, song.notes]);
    const { laneRef, fit, reservedRows } = useSongLyricsFit(
      trackNotes,
      lyricsRows,
      lyricsMinFit,
      uiScale,
    );

    const laneProps = {
      currentBeat,
      scale: uiScale * fit,
      reservedRows,
      enableZoom,
      lyricsLines,
      bpm,
    } as const;

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
          // Duets: 50/50 split, stacked on a portrait phone. Solo: centered column.
          flexDirection: isDuet && !stacked ? 'row' : 'column',
        }}
      >
        {isDuet ? (
          [
            { track: song.tracks![0], color: piece.blue, fallback: 'Player 1' },
            { track: song.tracks![1], color: piece.pink, fallback: 'Player 2' },
          ].map(({ track, color, fallback }, idx) => (
            <DuetPart
              key={idx}
              notes={track.notes}
              color={color}
              partName={track.name || fallback}
              stacked={stacked}
              first={idx === 0}
              isSmallScreen={isSmallScreen}
              laneRef={idx === 0 ? laneRef : undefined}
              laneProps={laneProps}
              mic={
                partChoice
                  ? {
                      active: partChoice.activeTrack === idx,
                      onClick: () => partChoice.select(idx, trackCount),
                    }
                  : undefined
              }
            />
          ))
        ) : (
          <>
            <LyricsLane
              notes={trackNotes[0]}
              laneRef={laneRef}
              color={piece.teal}
              align="center"
              {...laneProps}
            />
            {partChoice && partChoice.activeTrack === null && (
              <Box sx={{ mt: 0.5 }}>
                <PartMicButton
                  color={piece.teal}
                  active={false}
                  partName={song.tracks?.[0]?.name || t('melodiq.solo_part')}
                  onClick={() => partChoice.select(0, trackCount)}
                />
              </Box>
            )}
          </>
        )}
      </Box>
    );
  },
);
LyricsDisplay.displayName = 'LyricsDisplay';
