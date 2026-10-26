import { useCallback, useEffect, useState } from 'react';

export type MelodiqView =
  'Home' | 'Session' | 'Connection' | 'Playlists' | 'PlaylistDetails' | 'DownloadWait';

const SUB_VIEWS: readonly MelodiqView[] = ['Connection', 'Playlists', 'PlaylistDetails'];

/** Current Melodiq view plus browser-history handling for the sub views (back button). */
export function useMelodiqNavigation() {
  const [currentView, setCurrentView] = useState<MelodiqView>('Home');
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
  };
}
