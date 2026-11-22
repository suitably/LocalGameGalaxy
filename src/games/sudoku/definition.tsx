/**
 * Catalogue entry of Sudoku (ADR-0011) [ID: CATALOG-SUDOKU]
 *
 * Importing this file pulls in no page code; the page loads lazily.
 */
import Grid4x4Icon from '@mui/icons-material/Grid4x4Rounded';
import { defineGame, lazyNamed } from '../../lib/catalog/defineGame';

const Page = lazyNamed(() => import('./index'), 'SudokuGame');

export const definition = defineGame({
  id: 'sudoku',
  route: 'games/sudoku',
  i18n: 'games.sudoku',
  title: 'Sudoku',
  kind: 'game',
  area: 'puzzle',
  modes: ['solo'],
  listing: 'hub',
  icon: <Grid4x4Icon sx={{ fontSize: 72, mb: 2 }} />,
  component: <Page />,
});
