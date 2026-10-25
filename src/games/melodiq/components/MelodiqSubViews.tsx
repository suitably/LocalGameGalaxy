import React, { lazy, Suspense, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { type Playlist } from '../db';
import { MelodiqPlaylists } from './MelodiqPlaylists';
import { PlaylistDetails } from './PlaylistDetails';
import { ClientSettings } from './ClientSettings';
import { MelodiqConnection } from '../MelodiqConnection';
import { type MelodiqView } from '../hooks/useMelodiqNavigation';

const Settings = lazy(() =>
  import('../../../features/settings/Settings').then((m) => ({ default: m.Settings })),
);

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
  const [searchParams] = useSearchParams();
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const sub = searchParams.get('sub') || 'all';

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
          <Suspense
            fallback={
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            }
          >
            <Settings
              key={sub}
              activeGameId="melodiq"
              activeSub={sub}
              onBack={onBackFromSettings}
              onNavigateToPlaylists={() => setCurrentView('Playlists')}
            />
          </Suspense>
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
