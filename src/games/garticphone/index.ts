import { initGarticPhoneI18n } from './i18n';

// Every route of Gartic Phone loads through this barrel; its strings must be registered first.
initGarticPhoneI18n();

export { GarticPhoneGame } from './GarticPhoneGame';
