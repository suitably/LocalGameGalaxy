/**
 * Catalogue entry of Melodiq (ADR-0011) [ID: CATALOG-MELODIQ]
 *
 * Importing this file pulls in no page code; the pages load lazily.
 */
import GraphicEqIcon from '@mui/icons-material/GraphicEqRounded';
import { defineGame, lazyNamed } from '../../lib/catalog/defineGame';
import { SongsProvider } from './hooks/useSongs';

const load = () => import('./index');
const MelodiqGame = lazyNamed(load, 'MelodiqGame');
const MelodiqQueue = lazyNamed(load, 'MelodiqQueue');
const MelodiqTV = lazyNamed(load, 'MelodiqTV');

export const definition = defineGame({
  id: 'melodiq',
  route: 'games/melodiq',
  // The host keeps playing and serving phones and the TV from anywhere in the app (#888)
  keepAlive: true,
  i18n: 'games.melodiq',
  title: 'Melodiq',
  kind: 'game',
  area: 'music',
  modes: ['party_room'],
  listing: 'hub',
  party: { gameType: 'melodiq', descKey: 'party.melodiq_desc' },
  icon: <GraphicEqIcon sx={{ fontSize: 72, mb: 2 }} />,
  component: <MelodiqGame />,
  nestedRoutes: [
    {
      path: 'games/melodiq/queue',
      component: (
        <SongsProvider>
          <MelodiqQueue />
        </SongsProvider>
      ),
    },
  ],
  standaloneRoutes: [{ path: '/games/melodiq/tv', component: <MelodiqTV /> }],
});
