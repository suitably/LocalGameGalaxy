// Design tokens from DESIGN.md §2–§5. The theme (src/theme.ts) is built from these;
// components use theme.palette.*, never these values or raw hex directly.

export interface SchemeTokens {
  bg: { canvas: string; surface: string; raised: string };
  border: { subtle: string; strong: string };
  text: { primary: string; secondary: string; disabled: string };
  primary: { main: string; hover: string; edge: string; text: string; contrastText: string };
  accent: { main: string; contrastText: string };
  success: string;
  warning: string;
  error: string;
  onStatus: string;
  overlayShadow: string;
}

const INK = '#17141C';

export const darkTokens: SchemeTokens = {
  bg: { canvas: INK, surface: '#211D27', raised: '#2C2733' },
  border: { subtle: '#403A49', strong: '#6B6375' },
  text: { primary: '#F7F3EE', secondary: '#B9B1BD', disabled: '#7D7585' },
  primary: {
    main: '#FFC233',
    hover: '#FFCD5C',
    edge: '#C78F00',
    text: '#FFC233',
    contrastText: INK,
  },
  accent: { main: '#3DD6C4', contrastText: INK },
  success: '#5BD98A',
  warning: '#FF9F45',
  error: '#FF6B6B',
  onStatus: INK,
  overlayShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
};

// Not wired into the theme yet: light mode needs the mode setting (DESIGN.md §10 step 3)
// and games without hard-coded colours (step 5).
export const lightTokens: SchemeTokens = {
  bg: { canvas: '#FAF6F0', surface: '#FFFFFF', raised: '#F1EBE2' },
  border: { subtle: '#DDD3C5', strong: '#8C8291' },
  text: { primary: '#1D1A21', secondary: '#5F5866', disabled: '#9A919F' },
  primary: {
    main: '#FFC233',
    hover: '#FFCD5C',
    edge: '#C78F00',
    text: '#8A5B00',
    contrastText: INK,
  },
  accent: { main: '#0A6F65', contrastText: '#FFFFFF' },
  success: '#1A7A43',
  warning: '#A85400',
  error: '#C2302E',
  onStatus: '#FFFFFF',
  overlayShadow: '0 12px 32px rgba(29, 26, 33, 0.16)',
};

/** Player seats, dice, score rows, hub areas (DESIGN.md §2.3). Text on them is always ink. */
export const piecePalette = {
  red: '#EF4E4E',
  orange: '#FF8A3D',
  yellow: '#F7D038',
  green: '#3FBF6B',
  teal: '#2BB5A8',
  blue: '#3D8BFF',
  purple: '#9B6BFF',
  pink: '#F35FA8',
  contrastText: INK,
} as const;

export type PiecePalette = typeof piecePalette;
export type PieceColor = Exclude<keyof PiecePalette, 'contrastText'>;

/** Seat order (DESIGN.md §2.3): seat 1 = red, 2 = orange, … */
export const PIECE_ORDER: readonly PieceColor[] = [
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'purple',
  'pink',
];

/** Piece colour for a zero-based player slot; wraps after eight players. */
export const pieceColorForSlot = (index: number): string =>
  piecePalette[
    PIECE_ORDER[((index % PIECE_ORDER.length) + PIECE_ORDER.length) % PIECE_ORDER.length]
  ];

/** White and black game pieces (chess, checkers …), which the palette deliberately leaves out. */
export const pieceNeutrals = { white: '#F7F3EE', black: '#2C2733' } as const;

export const fontFamilies = {
  display: '"Bricolage Grotesque Variable", "Figtree Variable", system-ui, sans-serif',
  text: '"Figtree Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
} as const;

/** Scores, timers, dice sums: display face with tabular figures so they don't jump (DESIGN.md §3.1). */
export const scoreText = {
  fontFamily: fontFamilies.display,
  fontVariantNumeric: 'tabular-nums',
} as const;
