/**
 * Hub registry entry of Golf, kept here so `gameRegistry.tsx` stays in budget [ID: GOLF-DEFINITION]
 *
 * The page loads lazily; importing this file pulls in no page code. Plain `.ts` (with
 * `createElement`) because the fast-refresh lint rule flags non-component exports in `.tsx`.
 */
import { createElement, lazy } from 'react';
import SportsGolfRoundedIcon from '@mui/icons-material/SportsGolfRounded';
import type { GameDefinition } from '../../lib/gameRegistry';

const GolfGame = lazy(() => import('./index').then((m) => ({ default: m.GolfGame })));

export const golfDefinition: GameDefinition = {
  id: 'golf',
  route: 'games/golf',
  titleKey: 'games.golf.title',
  descriptionKey: 'games.golf.description',
  icon: createElement(SportsGolfRoundedIcon, { sx: { fontSize: 72, mb: 2 } }),
  category: 'cards',
  component: createElement(GolfGame),
};
