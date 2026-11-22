import { initDrawPotI18n } from './i18n';

// Every route of Drawpot loads through this barrel; its strings must be registered first.
initDrawPotI18n();

export { DrawPotGame } from './DrawPotGame';
export { DrawPotCreate } from './DrawPotCreate';
export { DrawPotParticipant } from './DrawPotParticipant';
export { DrawPotAdmin } from './DrawPotAdmin';
