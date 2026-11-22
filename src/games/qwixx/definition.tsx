/**
 * Catalogue entry of Qwixx (ADR-0011) [ID: CATALOG-QWIXX]
 *
 * Importing this file pulls in no page code; the page loads lazily.
 */
import CasinoIcon from '@mui/icons-material/CasinoRounded';
import { defineGame, lazyNamed } from '../../lib/catalog/defineGame';

const Page = lazyNamed(() => import('./index'), 'QwixxGame');

export const definition = defineGame({
  id: 'qwixx',
  route: 'games/qwixx',
  i18n: 'games.qwixx',
  title: 'Farbreihen',
  kind: 'game',
  area: 'dice',
  color: 'orange',
  modes: ['pass_and_play', 'party_room'],
  listing: 'dice',
  party: { gameType: 'qwixx' },
  icon: <CasinoIcon sx={{ fontSize: 72, mb: 2 }} />,
  component: <Page />,
});
