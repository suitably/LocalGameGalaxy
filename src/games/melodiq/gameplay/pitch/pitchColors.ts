import type { Theme } from '@mui/material';
import { singerColor } from '../../logic/singerColor';

/** Every colour the pitch canvas draws with; resolved from the theme, never hard-coded. */
export interface PitchColors {
  /** Notes and sung fill of the singer. */
  singer: string;
  /** Golden notes. */
  golden: string;
  /** Freestyle notes. */
  freestyle: string;
  beatLine: string;
  pitchLine: string;
  cursorLabel: string;
  /** Outline behind canvas text so it stays legible on video. */
  textOutline: string;
  debugText: string;
  debugBackground: string;
  label: string;
  fontFamily: string;
}

export const resolvePitchColors = (theme: Theme, hue: number): PitchColors => ({
  singer: singerColor(hue),
  golden: theme.palette.piece.yellow,
  freestyle: theme.palette.piece.purple,
  beatLine: theme.palette.divider,
  pitchLine: theme.palette.divider,
  cursorLabel: theme.palette.text.primary,
  textOutline: theme.palette.background.default,
  debugText: theme.palette.success.main,
  debugBackground: theme.palette.background.paper,
  label: theme.palette.text.secondary,
  fontFamily: theme.typography.fontFamily ?? 'sans-serif',
});

export const noteColor = (type: string, colors: PitchColors): string => {
  if (type === '*') return colors.golden;
  if (type === 'F') return colors.freestyle;
  return colors.singer;
};
