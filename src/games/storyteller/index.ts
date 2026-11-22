import { initStorytellerI18n } from './i18n';

// Every route of Storyteller loads through this barrel; its strings must be registered first.
initStorytellerI18n();

export { StorytellerGame } from './StorytellerGame';
export * from './types';
