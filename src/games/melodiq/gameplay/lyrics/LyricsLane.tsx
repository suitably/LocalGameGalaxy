import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import type { Note } from '../../parser';
import { LyricsLine, LeadInIndicator, type LineGroup } from '../LyricsLineView';
import { selectActiveLineIndex } from '../logic/lyricsLineSelection';
import { groupNotesIntoLines, leadInTiming, upcomingLinesAfter } from '../logic/lyricsLines';

export interface LyricsLaneProps {
  notes: Note[];
  currentBeat: number;
  /** Highlight colour of the singer (a piece colour from the theme). */
  color: string;
  align?: 'left' | 'center' | 'right';
  scale?: number;
  enableZoom?: boolean;
  lyricsLines?: number;
  bpm: number;
}

const FLEX_ALIGN = { left: 'flex-start', center: 'center', right: 'flex-end' } as const;

/*
 * Lyrics render over a video or a dark stage, so the text is always light and carries a dark
 * text-shadow for legibility (not decoration).
 */
const LEGIBILITY_SHADOW = '0 2px 5px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)';

const UpcomingLine: React.FC<{
  line: LineGroup;
  index: number;
  align: 'left' | 'center' | 'right';
  scale: number;
}> = ({ line, index, align, scale }) => (
  <Box
    sx={{
      minHeight: { xs: `${1.4 * scale}rem`, md: `${1.8 * scale}rem`, lg: `${2.2 * scale}rem` },
      display: 'flex',
      alignItems: 'center',
      justifyContent: FLEX_ALIGN[align],
      width: '100%',
      mt: 0.5,
    }}
  >
    <Typography
      component="div"
      sx={{
        textAlign: align,
        lineHeight: 1.3,
        fontSize: { xs: `${0.95 * scale}rem`, md: `${1.2 * scale}rem`, lg: `${1.4 * scale}rem` },
        fontWeight: 500,
        color: 'common.white',
        opacity: Math.max(0.1, 0.65 - index * 0.25),
        whiteSpace: 'nowrap',
        width: '100%',
      }}
    >
      {line.notes.map((note, idx) => (
        <Box
          key={idx}
          component="span"
          sx={{ display: 'inline-block', whiteSpace: 'pre', textShadow: LEGIBILITY_SHADOW }}
        >
          {note.text}
        </Box>
      ))}
    </Typography>
  </Box>
);

export const LyricsLane: React.FC<LyricsLaneProps> = React.memo(
  ({
    notes,
    currentBeat,
    color,
    align = 'center',
    scale = 1.0,
    enableZoom = false,
    lyricsLines = 2,
    bpm,
  }) => {
    const lines = useMemo(() => groupNotesIntoLines(notes || []), [notes]);
    const msPerBeat = 60000 / (bpm * 4);
    // Active line lingers after its end but is replaced shortly before the next line starts.
    const activeLineIndex = useMemo(
      () => selectActiveLineIndex(lines, currentBeat, msPerBeat),
      [lines, currentBeat, msPerBeat],
    );

    if (lyricsLines === 0) {
      return <Box sx={{ width: '100%', minHeight: { xs: 60, md: 120 } }} />;
    }

    const activeLine = activeLineIndex !== -1 ? lines[activeLineIndex] : null;
    const upcoming = upcomingLinesAfter(lines, activeLineIndex, Math.max(0, lyricsLines - 1));
    const { timeUntilStartSec, totalGapSec } = leadInTiming(
      lines,
      activeLineIndex,
      currentBeat,
      msPerBeat,
    );

    return (
      <Box
        sx={{
          textAlign: align,
          display: 'flex',
          flexDirection: 'column',
          alignItems: FLEX_ALIGN[align],
          px: { xs: 1.5, md: 3 },
          py: { xs: 0.5, md: 1 },
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        <LeadInIndicator
          timeUntilStartSec={timeUntilStartSec}
          totalGapSec={totalGapSec}
          primaryColor={color}
          scale={scale}
          align={align}
        />

        <Box
          sx={{
            minHeight: {
              xs: `${2.8 * scale}rem`,
              md: `${3.5 * scale}rem`,
              lg: `${4.2 * scale}rem`,
            },
            display: 'flex',
            alignItems: 'center',
            justifyContent: FLEX_ALIGN[align],
            textAlign: align,
            width: '100%',
          }}
        >
          {activeLine ? (
            <LyricsLine
              line={activeLine}
              currentBeat={currentBeat}
              primaryColor={color}
              align={align}
              scale={scale}
              enableZoom={enableZoom}
            />
          ) : (
            <Typography
              component="div"
              sx={{
                color: 'common.white',
                opacity: 0.4,
                fontStyle: 'italic',
                fontSize: { xs: `${1.1 * scale}rem`, md: `${1.3 * scale}rem` },
                textAlign: align,
              }}
            >
              ♪ ♫ ♪
            </Typography>
          )}
        </Box>

        {upcoming.map((line, idx) => (
          <UpcomingLine key={idx} line={line} index={idx} align={align} scale={scale} />
        ))}
      </Box>
    );
  },
);
LyricsLane.displayName = 'LyricsLane';
