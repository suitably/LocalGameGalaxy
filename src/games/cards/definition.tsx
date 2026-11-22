/**
 * Catalogue entry of Kartenspiel-Zähler (ADR-0011) [ID: CATALOG-CARDS]
 *
 * Importing this file pulls in no page code; the page loads lazily.
 */
import StyleIcon from '@mui/icons-material/StyleRounded';
import { defineGame, lazyNamed } from '../../lib/catalog/defineGame';

const Page = lazyNamed(() => import('./index'), 'CardsGame');

export const definition = defineGame({
  id: 'cards',
  route: 'games/cards',
  i18n: 'games.cards',
  title: 'Kartenspiel-Zähler',
  kind: 'tool',
  area: 'cards',
  color: 'purple',
  modes: ['pass_and_play'],
  listing: 'trackers',
  icon: <StyleIcon sx={{ fontSize: 72, mb: 2 }} />,
  component: <Page />,
});
