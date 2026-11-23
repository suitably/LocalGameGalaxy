/**
 * Catalogue entry of Dart Checker (ADR-0011) [ID: CATALOG-DARTS]
 *
 * Importing this file pulls in no page code; the page loads lazily.
 */
import AdsClickIcon from '@mui/icons-material/AdsClickRounded';
import { defineGame, lazyNamed } from '../../lib/catalog/defineGame';

const Page = lazyNamed(() => import('./index'), 'DartsGame');

export const definition = defineGame({
  id: 'darts',
  route: 'games/darts',
  i18n: 'games.darts',
  title: 'Dart Checker',
  kind: 'tool',
  area: 'party',
  modes: ['pass_and_play'],
  listing: 'hub',
  icon: <AdsClickIcon sx={{ fontSize: 72, mb: 2 }} />,
  component: <Page />,
});
