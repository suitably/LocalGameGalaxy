import MicIcon from '@mui/icons-material/MicRounded';
import CasinoIcon from '@mui/icons-material/CasinoRounded';
import i18n from 'i18next';
import type { CompanionPluginDefinition } from './types';
import { MelodiqCompanionConfig } from './MelodiqCompanionConfig';
import { TabletopCompanionConfig } from './TabletopCompanionConfig';

export function getCompanionPlugins(): CompanionPluginDefinition[] {
  return [
    {
      id: 'melodiq',
      name: i18n.t('settings.companion_melodiq_name'),
      gameId: 'melodiq',
      icon: <MicIcon color="primary" />,
      description: i18n.t('settings.companion_melodiq_desc'),
      defaultPort: 3000,
      status: 'available',
      renderConfig: ({ autoFocusUsdb, onBackToGame }) => (
        <MelodiqCompanionConfig autoFocusUsdb={autoFocusUsdb} onBackToGame={onBackToGame} />
      ),
    },
    {
      id: 'tabletop',
      name: i18n.t('settings.companion_tabletop_name'),
      gameId: 'tabletop',
      icon: <CasinoIcon sx={{ color: 'piece.red' }} />,
      description: i18n.t('settings.companion_tabletop_desc'),
      defaultPort: 3002,
      status: 'available',
      renderConfig: () => <TabletopCompanionConfig />,
    },
  ];
}
