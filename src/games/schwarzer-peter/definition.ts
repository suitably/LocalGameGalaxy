/**
 * Hub registry entry of Schwarzer Peter, kept here so `gameRegistry.tsx` stays in budget
 * [ID: SP-DEFINITION]
 *
 * The page loads lazily; importing this file pulls in no page code. Plain `.ts` (with
 * `createElement`) because the fast-refresh lint rule flags non-component exports in `.tsx`.
 */
import { createElement, lazy } from 'react';
import StyleRoundedIcon from '@mui/icons-material/StyleRounded';
import type { GameDefinition } from '../../lib/gameRegistry';

const SchwarzerPeterGame = lazy(() =>
  import('./index').then((m) => ({ default: m.SchwarzerPeterGame })),
);

export const schwarzerPeterDefinition: GameDefinition = {
  id: 'schwarzer-peter',
  route: 'games/schwarzer-peter',
  titleKey: 'games.schwarzer-peter.title',
  descriptionKey: 'games.schwarzer-peter.description',
  icon: createElement(StyleRoundedIcon, { sx: { fontSize: 72, mb: 2 } }),
  category: 'cards',
  component: createElement(SchwarzerPeterGame),
};
