/* eslint-disable react-refresh/only-export-components -- lazy section components next to a data export; not an HMR boundary */
import { lazy, type ComponentType } from 'react';
import TuneIcon from '@mui/icons-material/TuneRounded';
import PeopleIcon from '@mui/icons-material/PeopleRounded';
import VolumeUpIcon from '@mui/icons-material/VolumeUpRounded';
import SmartphoneIcon from '@mui/icons-material/SmartphoneRounded';
import type { GameSettingsSectionDefinition } from './gameSettingsTypes';

/** Maps a named export of a lazily imported module to the `default` export `lazy` expects. */
const pick =
  <K extends string>(name: K) =>
  (mod: Record<K, ComponentType>) => ({ default: mod[name] });

const WordleGameplaySection = lazy(() =>
  import('../games/wordle').then(pick('WordleGameplaySection')),
);
const NotesSoundsSection = lazy(() =>
  import('../games/melodiq-notes').then(pick('NotesSoundsSection')),
);
const MelodiqProfilesSection = lazy(() =>
  import('../games/melodiq').then(pick('MelodiqProfilesSection')),
);
const MelodiqGameplaySection = lazy(() =>
  import('../games/melodiq').then(pick('MelodiqGameplaySection')),
);
const MelodiqClientSection = lazy(() =>
  import('../games/melodiq').then(pick('MelodiqClientSection')),
);

const icon = (Icon: typeof TuneIcon) => <Icon color="primary" />;

/** Settings sections per game id (see GameDefinition.settings). */
export const GAME_SETTINGS_SECTIONS: Record<string, GameSettingsSectionDefinition[]> = {
  wordle: [
    {
      id: 'gameplay',
      titleKey: 'settings.sections.gameplay',
      icon: icon(TuneIcon),
      component: WordleGameplaySection,
    },
  ],
  'melodiq-notes': [
    {
      id: 'sounds',
      titleKey: 'settings.sections.sounds',
      icon: icon(VolumeUpIcon),
      component: NotesSoundsSection,
    },
  ],
  melodiq: [
    {
      id: 'profiles',
      titleKey: 'settings.sections.profiles',
      icon: icon(PeopleIcon),
      component: MelodiqProfilesSection,
    },
    {
      id: 'gameplay',
      titleKey: 'settings.sections.gameplay',
      icon: icon(TuneIcon),
      component: MelodiqGameplaySection,
      audience: 'host',
    },
    {
      id: 'client',
      titleKey: 'settings.sections.client',
      icon: icon(SmartphoneIcon),
      component: MelodiqClientSection,
      audience: 'client',
    },
  ],
};

/** Attaches the registered settings sections (if any) to a game definition by id. */
export const withGameSettings = <T extends { id: string }>(
  game: T,
): T & { settings?: { sections: GameSettingsSectionDefinition[] } } => {
  const sections = GAME_SETTINGS_SECTIONS[game.id];
  return sections ? { ...game, settings: { sections } } : game;
};
