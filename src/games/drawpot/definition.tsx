/**
 * Hub registry entry of the draw pot, kept here so `gameRegistry.tsx` stays in budget
 * [ID: DRAWPOT-DEFINITION]
 *
 * Every page loads lazily; importing this file pulls in no page code.
 */
import { lazy, type ComponentType } from 'react';
import ShuffleIcon from '@mui/icons-material/ShuffleRounded';
import type { GameDefinition } from '../../lib/gameRegistry';

type Pages = typeof import('./index');
const page = (name: keyof Pages) =>
  lazy(() => import('./index').then((m) => ({ default: m[name] as ComponentType })));

const Home = page('DrawPotGame');
const Create = page('DrawPotCreate');
const Participant = page('DrawPotParticipant');
const Admin = page('DrawPotAdmin');

export const drawPotDefinition: GameDefinition = {
  id: 'drawpot',
  route: 'games/drawpot',
  titleKey: 'games.drawpot.title',
  descriptionKey: 'games.drawpot.description',
  icon: <ShuffleIcon sx={{ fontSize: 72, mb: 2 }} />,
  category: 'party',
  component: <Home />,
  nestedRoutes: [
    { path: 'games/drawpot/new', component: <Create /> },
    { path: 'games/drawpot/p/:potId', component: <Participant /> },
    { path: 'games/drawpot/admin/:potId', component: <Admin /> },
  ],
};
