/**
 * Hub registry entry of Cabo, kept here so `gameRegistry.tsx` stays in budget [ID: CABO-DEFINITION]
 *
 * The page loads lazily; importing this file pulls in no page code. Plain `.ts` (with
 * `createElement`) because the fast-refresh lint rule flags non-component exports in `.tsx`.
 */
import { createElement, lazy } from 'react';
import ViewCarouselRoundedIcon from '@mui/icons-material/ViewCarouselRounded';
import type { GameDefinition } from '../../lib/gameRegistry';

const CaboGame = lazy(() => import('./index').then((m) => ({ default: m.CaboGame })));

export const caboDefinition: GameDefinition = {
  id: 'cabo',
  route: 'games/cabo',
  titleKey: 'games.cabo.title',
  descriptionKey: 'games.cabo.description',
  icon: createElement(ViewCarouselRoundedIcon, { sx: { fontSize: 72, mb: 2 } }),
  category: 'cards',
  component: createElement(CaboGame),
};
