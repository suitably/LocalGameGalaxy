import type React from 'react';

export type GameSettingsAudience = 'host' | 'client' | 'all'; // default 'all'

export interface GameSettingsSectionDefinition {
  id: string;
  titleKey: string;
  icon: React.ReactNode;
  component: React.LazyExoticComponent<React.ComponentType>;
  audience?: GameSettingsAudience;
}
