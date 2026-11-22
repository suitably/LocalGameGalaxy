import { initWerewolfI18n } from './i18n';

// Every route of Werewolf loads through this barrel; its strings must be registered first.
initWerewolfI18n();

export { WerewolfGame } from './WerewolfGame';
export { WerewolfEntry } from './WerewolfEntry';
