/**
 * Catalogue entry of Storyteller (ADR-0011) [ID: CATALOG-STORYTELLER]
 *
 * Importing this file pulls in no page code; the page loads lazily.
 */
import AutoStoriesIcon from '@mui/icons-material/AutoStoriesRounded';
import { defineGame, lazyNamed } from '../../lib/catalog/defineGame';

const Page = lazyNamed(() => import('./index'), 'StorytellerGame');

export const definition = defineGame({
  id: 'storyteller',
  route: 'games/storyteller',
  i18n: 'games.storyteller',
  title: 'Storyteller',
  kind: 'game',
  area: 'party',
  color: 'green',
  modes: ['party_room', 'async'],
  listing: 'hub',
  party: { gameType: 'storyteller', descKey: 'party.storyteller_desc' },
  icon: <AutoStoriesIcon sx={{ fontSize: 72, mb: 2 }} />,
  component: <Page />,
});
