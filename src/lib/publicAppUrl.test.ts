import { describe, expect, it } from 'vitest';
import { PUBLIC_APP_URL, publicAppLink } from './publicAppUrl';

describe('publicAppLink', () => {
  it('joins the public app URL and a route without a hash', () => {
    expect(publicAppLink('games/wordle')).toBe(`${PUBLIC_APP_URL}/games/wordle`);
    expect(publicAppLink('/games/sudoku')).toBe('https://games.nexumia.de/games/sudoku');
  });
});
