/**
 * Catalogue entry of GuessArt (ADR-0011) [ID: CATALOG-GUESSART]
 *
 * Importing this file pulls in no page code; the page loads lazily.
 */
import PaletteIcon from '@mui/icons-material/PaletteRounded';
import { defineGame, lazyNamed } from '../../lib/catalog/defineGame';

const Page = lazyNamed(() => import('./index'), 'GuessArtGame');

export const definition = defineGame({
  id: 'guessart',
  route: 'games/guessart',
  i18n: 'games.guessart',
  title: 'GuessArt',
  kind: 'game',
  area: 'party',
  modes: ['pass_and_play', 'party_room', 'async'],
  listing: 'hub',
  party: { gameType: 'guessart', descKey: 'party.guessart_desc' },
  icon: <PaletteIcon sx={{ fontSize: 72, mb: 2 }} />,
  component: <Page />,
});
