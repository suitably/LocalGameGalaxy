/**
 * Catalogue entry of Imposter (ADR-0011) [ID: CATALOG-IMPOSTER]
 *
 * Importing this file pulls in no page code; the page loads lazily.
 */
import PersonSearchIcon from '@mui/icons-material/PersonSearchRounded';
import { defineGame, lazyNamed } from '../../lib/catalog/defineGame';

const Page = lazyNamed(() => import('./index'), 'ImposterEntry');

export const definition = defineGame({
  id: 'imposter',
  route: 'games/imposter',
  i18n: 'games.imposter',
  title: 'Imposter',
  kind: 'game',
  area: 'party',
  modes: ['pass_and_play', 'party_room'],
  party: { gameType: 'imposter', descKey: 'party.imposter_desc' },
  listing: 'hub',
  icon: <PersonSearchIcon sx={{ fontSize: 72, mb: 2 }} />,
  component: <Page />,
});
