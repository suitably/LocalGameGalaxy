import { pieceNeutrals, piecePalette } from '../../themeTokens';

export interface DieColorConfig {
  bg: string;
  text: string;
  border?: string;
}

export const PRESET_DIE_COLORS: Record<string, DieColorConfig> = {
  white: { bg: pieceNeutrals.white, text: piecePalette.contrastText },
  red: { bg: piecePalette.red, text: piecePalette.contrastText },
  yellow: { bg: piecePalette.yellow, text: piecePalette.contrastText },
  green: { bg: piecePalette.green, text: piecePalette.contrastText },
  blue: { bg: piecePalette.blue, text: piecePalette.contrastText },
};
