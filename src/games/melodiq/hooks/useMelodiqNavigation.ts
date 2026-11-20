import { useCallback, useEffect, useRef, useState } from 'react';

export type MelodiqView =
  'Home' | 'Session' | 'Connection' | 'Playlists' | 'PlaylistDetails' | 'DownloadWait';

const SUB_VIEWS: readonly MelodiqView[] = ['Connection', 'Playlists', 'PlaylistDetails'];

/** Where the header back arrow leads from a sub view (default: the Melodiq home view). */
const PARENT_VIEW: Partial<Record<MelodiqView, MelodiqView>> = {
  PlaylistDetails: 'Playlists',
};

const isSubView = (value: unknown): value is MelodiqView =>
  typeof value === 'string' && SUB_VIEWS.includes(value as MelodiqView);

/**
 * Current Melodiq view plus browser-history handling for the sub views. Every sub view gets a
 * history entry, so the header back arrow and the browser / Android back button walk the same
 * path: playlist details -> playlists -> home.
 */
export function useMelodiqNavigation() {
  const [currentView, setCurrentView] = useState<MelodiqView>('Home');
  // Set when a view change comes from popstate, so it does not push a new history entry.
  const restoringFromHistory = useRef(false);

  const handleSetCurrentView = useCallback((v: string) => {
    setCurrentView(v as MelodiqView);
  }, []);

  const handleCloseSubView = useCallback(() => {
    if (isSubView(window.history.state?.melodiqSubView)) {
      window.history.back();
    } else {
      setCurrentView((view) => PARENT_VIEW[view] ?? 'Home');
    }
  }, []);

  useEffect(() => {
    if (!isSubView(currentView)) return;
    if (restoringFromHistory.current) {
      restoringFromHistory.current = false;
      return;
    }
    window.history.pushState({ melodiqSubView: currentView }, '', window.location.href);
  }, [currentView]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const target: unknown = event.state?.melodiqSubView;
      if (isSubView(target)) {
        setCurrentView((view) => {
          if (view !== target) restoringFromHistory.current = true;
          return target;
        });
      } else {
        setCurrentView((view) => (isSubView(view) ? 'Home' : view));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return {
    currentView,
    setCurrentView,
    handleSetCurrentView,
    handleCloseSubView,
  };
}
