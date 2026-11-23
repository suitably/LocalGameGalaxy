/**
 * Catalogue entry of Spieltisch (ADR-0011) [ID: CATALOG-TABLETOP]
 *
 * Importing this file pulls in no page code; the page loads lazily.
 */
import TableBarIcon from '@mui/icons-material/TableBarRounded';
import { defineGame, lazyNamed } from '../../lib/catalog/defineGame';

const Page = lazyNamed(() => import('./index'), 'TabletopGame');

export const definition = defineGame({
  id: 'tabletop',
  route: 'games/tabletop',
  i18n: 'games.tabletop',
  title: 'Spieltisch',
  kind: 'place',
  area: 'cards',
  modes: ['pass_and_play', 'party_room'],
  listing: 'hub',
  icon: <TableBarIcon sx={{ fontSize: 72, mb: 2 }} />,
  component: <Page />,
});
