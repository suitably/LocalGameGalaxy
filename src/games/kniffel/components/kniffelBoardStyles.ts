import { alpha, type SxProps, type Theme } from '@mui/material';
import { fontFamilies } from '../../../themeTokens';

/** Scores: display face, tabular figures so columns don't jump (DESIGN.md §3). */
export const scoreNumberSx: SxProps<Theme> = {
  fontFamily: fontFamilies.display,
  fontVariantNumeric: 'tabular-nums',
};

export const gridLine = (theme: Theme): string => `1px solid ${theme.palette.divider}`;

/** Highlight for a cell that can be scored right now (status colour `warning`). */
export const potentialFill = (theme: Theme): string => alpha(theme.palette.warning.main, 0.2);
