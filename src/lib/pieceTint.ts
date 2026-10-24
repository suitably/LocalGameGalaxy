import { alpha, type Theme } from '@mui/material';
import { PIECE_ORDER } from '../themeTokens';

/** Opacity of a piece colour used as a large-area tint (DESIGN.md §2.3). */
export const PIECE_TINT_OPACITY = 0.16;

/** Piece colour of a zero-based player slot, taken from the active theme. */
export const pieceFill = (theme: Theme, slot: number): string =>
  theme.palette.piece[
    PIECE_ORDER[((slot % PIECE_ORDER.length) + PIECE_ORDER.length) % PIECE_ORDER.length]
  ];

/** A player's score column / row tint: the piece colour at 16 % over the paper surface. */
export const pieceTint = (theme: Theme, slot: number, opacity = PIECE_TINT_OPACITY): string =>
  alpha(pieceFill(theme, slot), opacity);
