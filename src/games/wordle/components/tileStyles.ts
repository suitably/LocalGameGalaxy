/**
 * tileStyles.ts - Letter state styling shared by board, keyboard, history and help.
 * Colour is never the only cue: correct is underlined, present gets a dashed inner ring,
 * absent is muted (DESIGN.md §2).
 */

import type { LetterStatus } from '../logic/types';

export type TileStyle = Record<string, string>;

const STYLES: Record<LetterStatus, TileStyle> = {
  correct: {
    bgcolor: 'success.main',
    color: 'success.contrastText',
    borderColor: 'success.main',
    textDecoration: 'underline',
    textDecorationThickness: '3px',
    textUnderlineOffset: '4px',
  },
  present: {
    bgcolor: 'warning.main',
    color: 'warning.contrastText',
    borderColor: 'warning.contrastText',
    borderStyle: 'dashed',
  },
  absent: {
    bgcolor: 'action.disabledBackground',
    color: 'text.secondary',
    borderColor: 'action.disabledBackground',
  },
  tbd: { bgcolor: 'transparent', color: 'text.primary', borderColor: 'text.disabled' },
  empty: { bgcolor: 'transparent', color: 'text.primary', borderColor: 'divider' },
};

export const tileStyle = (status: LetterStatus): TileStyle => STYLES[status];

/** i18n key for the spoken state of a tile or key. */
export const statusLabelKey = (status: LetterStatus): string => `wordle.letter_state.${status}`;
