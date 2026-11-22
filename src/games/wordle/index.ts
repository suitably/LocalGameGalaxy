import { initWordleI18n } from './i18n';

// Every route of Wordle loads through this barrel; its strings must be registered first.
initWordleI18n();

export { WordleGame } from './WordleGame';
export { WordleGameplaySection } from './settings/WordleGameplaySection';
