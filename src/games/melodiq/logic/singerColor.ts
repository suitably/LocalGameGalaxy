import { piecePalette, type PieceColor } from '../../../themeTokens';

/** Anchor hue (degrees) per piece colour; blue and purple sit where the preset profile hues (240, 270) are. */
const PIECE_HUES: ReadonlyArray<readonly [PieceColor, number]> = [
  ['red', 0],
  ['orange', 24],
  ['yellow', 51],
  ['green', 139],
  ['teal', 174],
  ['blue', 240],
  ['purple', 285],
  ['pink', 330],
];

const hueDistance = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/**
 * Maps a profile hue (0-359, stored in singer profiles) to the nearest piece colour
 * (DESIGN.md §2.3). Singers keep their stored hue; only the rendered colour is a token.
 */
export const pieceColorForHue = (hue: number): PieceColor => {
  const safe = Number.isFinite(hue) ? ((hue % 360) + 360) % 360 : 0;
  let best: PieceColor = 'red';
  let bestDistance = Infinity;
  for (const [color, pieceHue] of PIECE_HUES) {
    const distance = hueDistance(safe, pieceHue);
    if (distance < bestDistance) {
      best = color;
      bestDistance = distance;
    }
  }
  return best;
};

/** Hex value of the piece colour closest to a profile hue (for canvas and non-theme code). */
export const singerColor = (hue: number): string => piecePalette[pieceColorForHue(hue)];
