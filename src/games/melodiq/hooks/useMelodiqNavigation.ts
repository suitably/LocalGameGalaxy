import { useCallback, useEffect, useState } from 'react';

export type MelodiqView =
  'Home' | 'Settings' | 'Session' | 'Connection' | 'Playlists' | 'PlaylistDetails' | 'DownloadWait';

const SUB_VIEWS: readonly MelodiqView[] = [
  'Settings',
  'Connection',
  'Playlists',
  'PlaylistDetails',
];

/** Current Melodiq view plus browser-history handling for the sub views (back button). */
export function useMelodiqNavigation(isSettingsFromUrl: boolean, refreshSongs: () => unknown) {
  const [currentView, setCurrentView] = useState<MelodiqView>(() =>
    isSettingsFromUrl ? 'Settings' : 'Home',
  );
  const handleSetCurrentView = useCallback((v: string) => {
    setCurrentView(v as MelodiqView);
  }, []);

  const handleCloseSubView = useCallback(() => {
    if (window.history.state?.melodiqSubView) {
      window.history.back();
    } else {
      setCurrentView('Home');
    }
  }, []);

  const handleBackFromSettings = useCallback(() => {
    refreshSongs();
    handleCloseSubView();
  }, [refreshSongs, handleCloseSubView]);

  useEffect(() => {
    if (SUB_VIEWS.includes(currentView)) {
      window.history.pushState({ melodiqSubView: true }, '', window.location.href);
      const handlePopState = () => setCurrentView('Home');
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [currentView]);

  return {
    currentView,
    setCurrentView,
    handleSetCurrentView,
    handleCloseSubView,
    handleBackFromSettings,
  };
}
