import { initMelodiqNotesI18n } from './i18n';

// Every route of Melodiq Notes loads through this barrel; its strings must be registered first.
initMelodiqNotesI18n();

export * from './MelodiqNotesEntry';
export * from './MelodiqNotesGame';
export * from './types';
export { NotesSoundsSection } from './settings/NotesSoundsSection';
