/**
 * Catalogue entry of Wordle (ADR-0011) [ID: CATALOG-WORDLE]
 *
 * Importing this file pulls in no page code; the page loads lazily.
 */
import AbcIcon from '@mui/icons-material/AbcRounded';
import { defineGame, lazyNamed } from '../../lib/catalog/defineGame';

const Page = lazyNamed(() => import('./index'), 'WordleGame');

export const definition = defineGame({
  id: 'wordle',
  route: 'games/wordle',
  i18n: 'games.wordle',
  title: 'Wortraten',
  kind: 'game',
  area: 'puzzle',
  modes: ['solo'],
  listing: 'hub',
  icon: <AbcIcon sx={{ fontSize: 72, mb: 2 }} />,
  component: <Page />,
});
