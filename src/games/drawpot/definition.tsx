/**
 * Catalogue entry of the draw pot (ADR-0011) [ID: DRAWPOT-DEFINITION]
 *
 * Every page loads lazily; importing this file pulls in no page code.
 */
import ShuffleIcon from '@mui/icons-material/ShuffleRounded';
import { defineGame, lazyNamed } from '../../lib/catalog/defineGame';

const load = () => import('./index');
const Home = lazyNamed(load, 'DrawPotGame');
const Create = lazyNamed(load, 'DrawPotCreate');
const Participant = lazyNamed(load, 'DrawPotParticipant');
const Admin = lazyNamed(load, 'DrawPotAdmin');

export const definition = defineGame({
  id: 'drawpot',
  route: 'games/drawpot',
  i18n: 'games.drawpot',
  title: 'Lostopf',
  kind: 'tool',
  area: 'party',
  modes: ['async'],
  listing: 'hub',
  icon: <ShuffleIcon sx={{ fontSize: 72, mb: 2 }} />,
  component: <Home />,
  nestedRoutes: [
    { path: 'games/drawpot/new', component: <Create /> },
    { path: 'games/drawpot/p/:potId', component: <Participant /> },
    { path: 'games/drawpot/admin/:potId', component: <Admin /> },
  ],
});
