/**
 * Catalogue entry of Knister (ADR-0011) [ID: CATALOG-KNISTER]
 *
 * Importing this file pulls in no page code; the page loads lazily.
 */
import GridViewIcon from '@mui/icons-material/GridViewRounded';
import { defineGame, lazyNamed } from '../../lib/catalog/defineGame';

const Page = lazyNamed(() => import('./index'), 'KnisterGame');

export const definition = defineGame({
  id: 'knister',
  route: 'games/knister',
  i18n: 'games.knister',
  title: 'Knister',
  kind: 'game',
  area: 'dice',
  color: 'orange',
  modes: ['solo', 'pass_and_play', 'party_room'],
  listing: 'dice',
  party: { gameType: 'knister' },
  icon: <GridViewIcon sx={{ fontSize: 72, mb: 2 }} />,
  component: <Page />,
});
