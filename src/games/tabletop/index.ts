import { initTabletopI18n } from './i18n';

// Every route of the Spieltisch loads through this barrel; its strings must be registered first.
initTabletopI18n();

export { TabletopEntry as TabletopGame } from './TabletopEntry';
export type { TabletopGameDefinition, TabletopWidget, TabletopPlayMode } from './logic/types';
