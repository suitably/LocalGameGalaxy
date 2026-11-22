import { initSudokuI18n } from './i18n';

// Every route of Sudoku loads through this barrel; its strings must be registered first.
initSudokuI18n();

export { SudokuGame } from './SudokuGame';
