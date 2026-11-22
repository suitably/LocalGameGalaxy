/**
 * Catalogue entry of the party room (ADR-0011) [ID: CATALOG-PARTY]
 *
 * A place, not a game: it opens the lobby where a group picks a game.
 */
import CelebrationIcon from '@mui/icons-material/CelebrationRounded';
import { defineGame, lazyNamed } from '../../lib/catalog/defineGame';

const PartyLobby = lazyNamed(() => import('./PartyLobby'), 'PartyLobby');

export const definition = defineGame({
  id: 'party',
  route: 'party',
  i18n: 'games.party',
  title: 'Party',
  kind: 'place',
  area: 'party',
  modes: ['party_room'],
  listing: 'hub',
  icon: <CelebrationIcon sx={{ fontSize: 72, mb: 2 }} />,
  component: <PartyLobby />,
});
