/**
 * Catalogue entry of Kniffel (ADR-0011) [ID: CATALOG-KNIFFEL]
 *
 * Importing this file pulls in no page code; the page loads lazily.
 */
import CasinoIcon from '@mui/icons-material/CasinoRounded';
import { defineGame, lazyNamed } from '../../lib/catalog/defineGame';

const Page = lazyNamed(() => import('./index'), 'KniffelGame');

export const definition = defineGame({
  id: 'kniffel',
  route: 'games/kniffel',
  i18n: 'games.kniffel',
  title: 'Kniffel',
  kind: 'game',
  area: 'dice',
  color: 'red',
  modes: ['pass_and_play', 'party_room'],
  listing: 'dice',
  party: { gameType: 'kniffel' },
  icon: <CasinoIcon sx={{ fontSize: 72, mb: 2 }} />,
  component: <Page />,
});
