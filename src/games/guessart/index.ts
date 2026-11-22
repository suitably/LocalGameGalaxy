import { initGuessArtI18n } from './i18n';

// Every route of GuessArt loads through this barrel; its strings must be registered first.
initGuessArtI18n();

export { GuessArtGame } from './GuessArtGame';
export * from './logic/types';
