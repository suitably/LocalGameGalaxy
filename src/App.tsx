import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { App as CapacitorApp } from '@capacitor/app';
import { MainLayout } from './components/Layout/MainLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { gameRegistry } from './lib/gameRegistry';
import { useServerUrlAutoConnect } from './hooks/useServerUrlAutoConnect';
import { hasGitHubPAT } from './lib/github';

// Route-level code splitting: the hub and settings load on first visit (the party lobby is a
// registry entry like the games, see gameRegistry.tsx).
const Hub = lazy(() => import('./features/hub/Hub').then((m) => ({ default: m.Hub })));
const Settings = lazy(() =>
  import('./features/settings/Settings').then((m) => ({ default: m.Settings })),
);
// Gartic Phone has no hub card: the party lobby launches it for the whole room.
const GarticPhoneGame = lazy(() =>
  import('./games/garticphone').then((m) => ({ default: m.GarticPhoneGame })),
);

// Loading fallback component
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

function FeedbackRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!hasGitHubPAT()) {
      navigate('/settings?tab=general&sub=feedback&missing_pat=1', { replace: true });
    } else {
      navigate('/', { replace: true });
      setTimeout(() => {
        window.dispatchEvent(new Event('feedback:open'));
      }, 50);
    }
  }, [navigate]);
  return null;
}

// Inner component to use navigation hook
function AppRoutes() {
  const navigate = useNavigate();
  useServerUrlAutoConnect();

  useEffect(() => {
    const handleBackButton = () => {
      // If a modal, dialog or drawer is currently open, close it first via Escape
      const openModal = document.querySelector(
        'dialog[open], .MuiDialog-root, .MuiModal-root:not([aria-hidden="true"])',
      );
      if (openModal) {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }),
        );
        return;
      }

      if (window.location.pathname === '/') {
        CapacitorApp.exitApp();
      } else {
        navigate(-1);
      }
    };

    const listener = CapacitorApp.addListener('backButton', handleBackButton);
    return () => {
      listener.then((l) => l.remove());
    };
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route
          index
          element={
            <Suspense fallback={<LoadingFallback />}>
              <Hub />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <Settings />
            </Suspense>
          }
        />
        <Route path="feedback" element={<FeedbackRedirect />} />
        <Route
          path="games/garticphone"
          element={
            <ErrorBoundary componentName="garticphone">
              <Suspense fallback={<LoadingFallback />}>
                <GarticPhoneGame />
              </Suspense>
            </ErrorBoundary>
          }
        />

        {/* Dynamic Game Routes registered via GameRegistry (OCP) */}
        {gameRegistry.getGames().map((game) => (
          <Route
            key={game.id}
            path={game.route}
            element={
              <ErrorBoundary componentName={game.id}>
                <Suspense fallback={<LoadingFallback />}>{game.component}</Suspense>
              </ErrorBoundary>
            }
          />
        ))}

        {/* Dynamic Game Nested Routes (e.g. Melodiq Queue) */}
        {gameRegistry.getGames().flatMap((game) =>
          (game.nestedRoutes || []).map((nr) => (
            <Route
              key={`${game.id}-${nr.path}`}
              path={nr.path}
              element={
                <ErrorBoundary componentName={`${game.id} - ${nr.path}`}>
                  <Suspense fallback={<LoadingFallback />}>{nr.component}</Suspense>
                </ErrorBoundary>
              }
            />
          )),
        )}
      </Route>

      {/* Dynamic Standalone Routes (e.g. Melodiq TV Mode) */}
      {gameRegistry.getGames().flatMap((game) =>
        (game.standaloneRoutes || []).map((sr) => (
          <Route
            key={`${game.id}-${sr.path}`}
            path={sr.path}
            element={
              <ErrorBoundary componentName={`${game.id} - Standalone`}>
                <Suspense fallback={<LoadingFallback />}>{sr.component}</Suspense>
              </ErrorBoundary>
            }
          />
        )),
      )}
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary componentName="App Root">
      <Suspense fallback={<LoadingFallback />}>
        <AppRoutes />
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
