import React from 'react';
import { alpha, Box, Typography } from '@mui/material';
import type { Note } from '../parser';
import { transitionOf } from '../../../lib/motion';
import { LineWords } from './lyrics/LineWords';
import { ACTIVE_LINE_REM, type LyricsRows } from './logic/lyricsFit';

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
export const LeadInIndicator: React.FC<LeadInIndicatorProps> = React.memo(
  ({ timeUntilStartSec, totalGapSec, primaryColor, scale = 1.0, align = 'center' }) => {
    if (timeUntilStartSec <= 0 || totalGapSec < 2.5) {
      return <Box sx={{ height: `${1.2 * scale}rem` }} />;
    }

    const isCountdownActive = timeUntilStartSec <= 3.0;
    const isLongBreak = timeUntilStartSec > 3.0 && totalGapSec >= 5.0;

    return (
      <Box
        sx={{
          height: `${1.2 * scale}rem`,
          display: 'flex',
          alignItems: 'center',
          justifyContent:
            align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
          gap: 1,
          mb: 0.25,
          transition: 'opacity 0.2s ease-in-out',
          opacity: isCountdownActive || isLongBreak ? 1 : 0,
        }}
      >
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
                    transform: isLit ? 'scale(1.2)' : 'scale(1.0)',
                    transition: transitionOf(['background-color', 'transform'], 'short', 'bounce'),
                  }}
                />
              );
            })}
          </Box>
        ) : isLongBreak ? (
          // Sleek Instrumental Pause Badge
          <Box
            sx={{
              px: 1.2,
              py: 0.2,
              borderRadius: 3,
              bgcolor: 'rgba(0,0,0,0.5)',
              border: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.2)}`,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: `${0.75 * scale}rem`,
                color: 'text.secondary',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              ♪ In {Math.ceil(timeUntilStartSec)}s
            </Typography>
          </Box>
        ) : null}
      </Box>
    );
  },
);
LeadInIndicator.displayName = 'LeadInIndicator';

export interface LyricsLineProps {
  line: LineGroup;
  currentBeat: number;
  primaryColor: string;
  align: 'left' | 'center' | 'right';
  scale: number;
  rows: LyricsRows;
  enableZoom: boolean;
}

/**
 * Renders the active singing line with real-time syllable highlighting.
 */
export const LyricsLine: React.FC<LyricsLineProps> = React.memo(
  ({ line, currentBeat, primaryColor, align, scale, rows, enableZoom }) => {
    return (
      <Typography
        component="div"
        sx={{
          textAlign: align,
          lineHeight: 1.3,
          fontSize: {
            xs: `${ACTIVE_LINE_REM.xs * scale}rem`,
            md: `${ACTIVE_LINE_REM.md * scale}rem`,
            lg: `${ACTIVE_LINE_REM.lg * scale}rem`,
          },
          fontWeight: 700, // Constant weight guarantees zero font metric layout shift
          whiteSpace: rows === 1 ? 'nowrap' : 'normal',
          textWrap: 'balance',
          width: '100%',
          minWidth: 0,
        }}
      >
        <LineWords
          notes={line.notes}
          renderNote={(note, key) => {
            const noteEnd = note.start + note.duration;
            const isPast = currentBeat >= noteEnd;
            const isActive = currentBeat >= note.start && currentBeat < noteEnd;
            const noteColor = isActive
              ? primaryColor
              : isPast
                ? '#ffffff'
                : 'rgba(255,255,255,0.72)';
            const baseShadow = '0 2px 6px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.8)';

            return (
              <Box
                key={key}
                component="span"
                sx={{
                  display: 'inline-block',
                  color: noteColor,
                  textShadow: baseShadow,
                  filter: enableZoom && isActive ? 'brightness(1.25)' : 'none',
                  transition:
                    'color 0.05s ease-out, text-shadow 0.05s ease-out, filter 0.05s ease-out',
                  whiteSpace: 'pre',
                }}
              >
                {note.text}
              </Box>
            );
          }}
        />
      </Typography>
    );
  },
);
LyricsLine.displayName = 'LyricsLine';
