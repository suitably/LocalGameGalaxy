import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import type { Note } from '../../parser';
import { LyricsLine, LeadInIndicator, type LineGroup } from '../LyricsLineView';
import { LineWords } from './LineWords';
import { ACTIVE_LINE_REM, type LyricsRows } from '../logic/lyricsFit';
import { selectActiveLineIndex } from '../logic/lyricsLineSelection';
import { groupNotesIntoLines, leadInTiming, upcomingLinesAfter } from '../logic/lyricsLines';

export interface LyricsLaneProps {
  notes: Note[];
  currentBeat: number;
  /** Highlight colour of the singer (a piece colour from the theme). */
  color: string;
  align?: 'left' | 'center' | 'right';
  scale?: number;
  /** Rows to keep free so the layout stays still when only some lines wrap. */
  reservedRows?: LyricsRows;
  /** Set on the lane whose width sizes the song's lyrics. */
  laneRef?: React.Ref<HTMLDivElement>;
  enableZoom?: boolean;
  lyricsLines?: number;
  bpm: number;
}

const FLEX_ALIGN = { left: 'flex-start', center: 'center', right: 'flex-end' } as const;

const UPCOMING_LINE_REM = { xs: 0.95, md: 1.2, lg: 1.4 } as const;
const LINE_HEIGHT = 1.3;

/** `minHeight` for two wrapped rows at each breakpoint. */
const twoRowHeight = (rem: { xs: number; md: number; lg: number }, scale: number) => ({
  xs: `${2 * LINE_HEIGHT * rem.xs * scale}rem`,
  md: `${2 * LINE_HEIGHT * rem.md * scale}rem`,
  lg: `${2 * LINE_HEIGHT * rem.lg * scale}rem`,
});

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
  reservedRows: LyricsRows;
}> = ({ line, index, align, scale, reservedRows }) => (
  <Box
    sx={{
      minHeight:
        reservedRows === 2
          ? twoRowHeight(UPCOMING_LINE_REM, scale)
          : { xs: `${1.4 * scale}rem`, md: `${1.8 * scale}rem`, lg: `${2.2 * scale}rem` },
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
        lineHeight: LINE_HEIGHT,
        fontSize: {
          xs: `${UPCOMING_LINE_REM.xs * scale}rem`,
          md: `${UPCOMING_LINE_REM.md * scale}rem`,
          lg: `${UPCOMING_LINE_REM.lg * scale}rem`,
        },
        fontWeight: 500,
        color: 'common.white',
        opacity: Math.max(0.1, 0.65 - index * 0.25),
        whiteSpace: 'normal',
        textWrap: 'balance',
        width: '100%',
        minWidth: 0,
      }}
    >
      <LineWords
        notes={line.notes}
        renderNote={(note, key) => (
          <Box
            key={key}
            component="span"
            sx={{ display: 'inline-block', whiteSpace: 'pre', textShadow: LEGIBILITY_SHADOW }}
          >
            {note.text}
          </Box>
        )}
      />
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
    reservedRows = 1,
    laneRef,
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
        ref={laneRef}
        sx={{
          textAlign: align,
          display: 'flex',
          flexDirection: 'column',
          alignItems: FLEX_ALIGN[align],
          px: { xs: 1.5, md: 3 },
          py: { xs: 0.5, md: 1 },
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
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
            minHeight:
              reservedRows === 2
                ? twoRowHeight(ACTIVE_LINE_REM, scale)
                : {
                    xs: `${2.8 * scale}rem`,
                    md: `${3.5 * scale}rem`,
                    lg: `${4.2 * scale}rem`,
                  },
            display: 'flex',
            alignItems: 'center',
            justifyContent: FLEX_ALIGN[align],
            textAlign: align,
            width: '100%',
            minWidth: 0,
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
          <UpcomingLine
            key={idx}
            line={line}
            index={idx}
            align={align}
            scale={scale}
            reservedRows={reservedRows}
          />
        ))}
      </Box>
    );
  },
);
LyricsLane.displayName = 'LyricsLane';
