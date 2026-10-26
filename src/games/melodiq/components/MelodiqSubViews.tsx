import React, { useState } from 'react';
import { Box, Button, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SettingsSection } from '../../../components/settings';
import { MelodiqProfilesSection } from '../settings/MelodiqProfilesSection';
import { MelodiqGameplaySection } from '../settings/MelodiqGameplaySection';
import { type Playlist } from '../db';
import { MelodiqPlaylists } from './MelodiqPlaylists';
import { PlaylistDetails } from './PlaylistDetails';
import { ClientSettings } from './ClientSettings';
import { MelodiqConnection } from '../MelodiqConnection';
import { type MelodiqView } from '../hooks/useMelodiqNavigation';

interface MelodiqSubViewsProps {
  currentView: MelodiqView;
  setCurrentView: (view: MelodiqView) => void;
  isClient: boolean;
  onBackFromSettings: () => void;
  onCloseSubView: () => void;
}

/** Settings, connection and playlist screens; kept mounted and toggled via `display`. */
export const MelodiqSubViews: React.FC<MelodiqSubViewsProps> = ({
  currentView,
  setCurrentView,
  isClient,
  onBackFromSettings,
  onCloseSubView,
}) => {
  const { t } = useTranslation();
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);

  return (
    <>
      <Box
        sx={{
          display: currentView === 'Settings' ? 'block' : 'none',
          height: '100%',
          overflow: 'auto',
        }}
      >
        {isClient ? (
          <ClientSettings onBack={onBackFromSettings} />
        ) : (
          // Temporary in-game view until the in-game settings sheet replaces it.
          <Stack spacing={3} sx={{ p: { xs: 1.5, sm: 2 } }}>
            <SettingsSection id="profiles" title={t('settings.sections.profiles')}>
              <MelodiqProfilesSection />
            </SettingsSection>
            <SettingsSection id="gameplay" title={t('settings.sections.gameplay')}>
              <MelodiqGameplaySection />
            </SettingsSection>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" onClick={() => setCurrentView('Playlists')}>
                {t('melodiq.manage_playlists', 'Manage Playlists')}
              </Button>
              <Button variant="contained" onClick={onBackFromSettings}>
                {t('common.back', 'Zurück')}
              </Button>
            </Box>
          </Stack>
        )}
      </Box>

      <Box
        sx={{
          display: currentView === 'Connection' ? 'block' : 'none',
          height: '100%',
          overflow: 'auto',
        }}
      >
        <MelodiqConnection onBack={onCloseSubView} />
      </Box>

      <Box sx={{ display: currentView === 'Playlists' ? 'block' : 'none', height: '100%' }}>
        <MelodiqPlaylists
          onBack={onCloseSubView}
          onSelectPlaylist={(p) => {
            setActivePlaylist(p);
            setCurrentView('PlaylistDetails');
          }}
        />
      </Box>

      <Box sx={{ display: currentView === 'PlaylistDetails' ? 'block' : 'none', height: '100%' }}>
        {activePlaylist && (
          <PlaylistDetails playlist={activePlaylist} onBack={() => setCurrentView('Playlists')} />
        )}
      </Box>
    </>
  );
};
