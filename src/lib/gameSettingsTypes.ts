import type React from 'react';

export type GameSettingsAudience = 'host' | 'client' | 'all'; // default 'all'

export interface GameSettingsSectionDefinition {
  id: string;
  titleKey: string;
  icon: React.ReactNode;
  component: React.LazyExoticComponent<React.ComponentType>;
  audience?: GameSettingsAudience;
}

/** Audience of the viewer: hosts see 'all' + 'host' sections, clients 'all' + 'client'. */
export type GameSettingsViewer = Exclude<GameSettingsAudience, 'all'>;

/** Sections visible to a viewer. */
export const filterSectionsByAudience = (
  sections: readonly GameSettingsSectionDefinition[],
  audience: GameSettingsViewer,
): GameSettingsSectionDefinition[] =>
  sections.filter(
    (s) => s.audience === undefined || s.audience === 'all' || s.audience === audience,
  );
