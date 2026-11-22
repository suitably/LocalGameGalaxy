import { initImposterI18n } from './i18n';

// Every route of Imposter loads through this barrel; its strings must be registered first.
initImposterI18n();

export { ImposterGame } from './ImposterGame';
export { ImposterEntry } from './ImposterEntry';
