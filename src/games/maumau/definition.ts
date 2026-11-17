/**
 * Hub registry entry of Mau-Mau [ID: MAUMAU-DEFINITION]
 *
 * The page loads lazily; importing this file pulls in no page code. Plain `.ts` (with
 * `createElement`) because the fast-refresh lint rule flags non-component exports in `.tsx`.
 */
import { createElement, lazy } from 'react';
import StyleRoundedIcon from '@mui/icons-material/StyleRounded';
import type { GameDefinition } from '../../lib/gameRegistry';

const MauMauGame = lazy(() => import('./index').then((m) => ({ default: m.MauMauGame })));

export const maumauDefinition: GameDefinition = {
  id: 'maumau',
  route: 'games/maumau',
  titleKey: 'games.maumau.title',
  descriptionKey: 'games.maumau.description',
  icon: createElement(StyleRoundedIcon, { sx: { fontSize: 72, mb: 2 } }),
  category: 'cards',
  component: createElement(MauMauGame),
};
