import { initDartsI18n } from './i18n';

// Every route of Darts loads through this barrel; its strings must be registered first.
initDartsI18n();

export { DartsGame } from './DartsGame';
