/**
 * Catalogue entry of Werwolf (ADR-0011) [ID: CATALOG-WEREWOLF]
 *
 * Importing this file pulls in no page code; the page loads lazily.
 */
import SportsEsportsIcon from '@mui/icons-material/SportsEsportsRounded';
import { defineGame, lazyNamed } from '../../lib/catalog/defineGame';

const Page = lazyNamed(() => import('./index'), 'WerewolfEntry');

export const definition = defineGame({
  id: 'werewolf',
  route: 'games/werewolf',
  i18n: 'games.werewolf',
  title: 'Werwolf',
  kind: 'game',
  area: 'party',
  modes: ['pass_and_play', 'party_room'],
  party: { gameType: 'werewolf', descKey: 'party.werewolf_desc' },
  listing: 'hub',
  icon: <SportsEsportsIcon sx={{ fontSize: 72, mb: 2 }} />,
  component: <Page />,
});
