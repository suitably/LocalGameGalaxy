import { describe, expect, it } from 'vitest';
import { piecePalette } from '../../../themeTokens';
import { hueForPieceColor, PIECE_HUES, pieceColorForHue, singerColor } from './singerColor';

describe('pieceColorForHue', () => {
  it('maps the preset profile hues to piece colours', () => {
    expect(pieceColorForHue(190)).toBe('teal');
    expect(pieceColorForHue(120)).toBe('green');
    expect(pieceColorForHue(240)).toBe('blue');
    expect(pieceColorForHue(270)).toBe('purple');
    expect(pieceColorForHue(330)).toBe('pink');
    expect(pieceColorForHue(0)).toBe('red');
    expect(pieceColorForHue(30)).toBe('orange');
  });

  it('wraps around the colour wheel', () => {
    expect(pieceColorForHue(359)).toBe('red');
    expect(pieceColorForHue(-10)).toBe('red');
    expect(pieceColorForHue(720 + 240)).toBe('blue');
  });

  it('falls back to red for non-finite hues', () => {
    expect(pieceColorForHue(Number.NaN)).toBe('red');
  });
});

describe('singerColor', () => {
  it('returns the palette value', () => {
    expect(singerColor(240)).toBe(piecePalette.blue);
  });
});

describe('hueForPieceColor', () => {
  it('round-trips every piece colour through its stored hue', () => {
    for (const [color] of PIECE_HUES) {
      expect(pieceColorForHue(hueForPieceColor(color))).toBe(color);
    }
  });
});
