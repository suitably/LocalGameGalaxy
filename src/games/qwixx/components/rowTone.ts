import { alpha, type Theme } from '@mui/material/styles';
import type { RowColor } from '../logic/types';

export interface RowTone {
  /** Row / segment fill (piece colour). */
  fill: string;
  /** Ink that is readable on `fill`. */
  ink: string;
  /** Uncrossed number button. */
  button: string;
  /** Crossed number button. */
  buttonCrossed: string;
  /** Faint ink for disabled controls on `fill`. */
  muted: string;
}

export const getRowTone = (theme: Theme, color: RowColor): RowTone => {
  const { piece } = theme.palette;
  return {
    fill: piece[color],
    ink: piece.contrastText,
    button: theme.palette.common.white,
    buttonCrossed: piece.contrastText,
    muted: alpha(piece.contrastText, 0.2),
  };
};
