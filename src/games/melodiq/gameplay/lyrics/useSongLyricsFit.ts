import { useEffect, useMemo, useRef, useState } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import type { Note } from '../../parser';
import {
  ACTIVE_LINE_REM,
  lyricsFitFactor,
  songWidestRowEm,
  type LyricsRows,
  type MeasureEm,
} from '../logic/lyricsFit';
import { groupNotesIntoLines } from '../logic/lyricsLines';

const MEASURE_FONT_PX = 100;

/** Measures text in em with the active line's bold font; null where canvas is unavailable. */
function createMeasureEm(fontFamily: string): MeasureEm | null {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return null;
  context.font = `700 ${MEASURE_FONT_PX}px ${fontFamily}`;
  return (text) => context.measureText(text).width / MEASURE_FONT_PX;
}

/**
 * One font factor for a whole song, from its widest row and the lane width: the size never jumps
 * between lines, and duet lanes match because all tracks are measured together.
 * `reservedRows` keeps the layout still when only some lines wrap.
 */
export function useSongLyricsFit(tracks: Note[][], rows: LyricsRows, scale: number) {
  const theme = useTheme();
  const isLg = useMediaQuery(theme.breakpoints.up('lg'));
  const isMd = useMediaQuery(theme.breakpoints.up('md'));
  const laneRef = useRef<HTMLDivElement>(null);
  const [laneWidth, setLaneWidth] = useState(0);

  useEffect(() => {
    const lane = laneRef.current;
    if (!lane || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setLaneWidth(entry.contentRect.width));
    observer.observe(lane);
    return () => observer.disconnect();
  }, []);

  const fontFamily = theme.typography.body1.fontFamily ?? theme.typography.fontFamily ?? 'inherit';
  const [measure, setMeasure] = useState(() => createMeasureEm(fontFamily));

  // Measures right away so nothing waits on font loading, then again with the real web font
  useEffect(() => {
    let mounted = true;
    document.fonts?.ready.then(() => {
      if (mounted) setMeasure(() => createMeasureEm(fontFamily));
    });
    return () => {
      mounted = false;
    };
  }, [fontFamily]);

  const widest = useMemo(() => {
    if (!measure) return { oneRow: 0, chosen: 0 };
    const lines = tracks.flatMap((notes) =>
      groupNotesIntoLines(notes).map((line) => line.notes.map((n) => n.text).join('')),
    );
    return {
      oneRow: songWidestRowEm(lines, 1, measure),
      chosen: songWidestRowEm(lines, rows, measure),
    };
  }, [tracks, rows, measure]);

  const rem = isLg ? ACTIVE_LINE_REM.lg : isMd ? ACTIVE_LINE_REM.md : ACTIVE_LINE_REM.xs;
  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const fontPx = rem * scale * rootPx;
  const fit = lyricsFitFactor(widest.chosen, laneWidth, fontPx, rows);
  const anyLineWraps = rows === 2 && laneWidth > 0 && widest.oneRow * fontPx * fit > laneWidth;

  return { laneRef, fit, reservedRows: (anyLineWraps ? 2 : 1) as LyricsRows };
}
