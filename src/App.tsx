import { Suspense, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { App as CapacitorApp } from '@capacitor/app';
import { MainLayout } from './components/Layout/MainLayout';
import { gameRegistry } from './lib/gameRegistry';
import { Hub } from './features/hub/Hub';
import { Settings } from './features/settings/Settings';

// Loading fallback component
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

// Inner component to use navigation hook
function AppRoutes() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleBackButton = () => {
      // If a modal, dialog or drawer is currently open, close it first via Escape
      const openModal = document.querySelector('dialog[open], .MuiDialog-root, .MuiModal-root:not([aria-hidden="true"])');
      if (openModal) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
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
      listener.then(l => l.remove());
    };
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={
          <Suspense fallback={<LoadingFallback />}>
            <Hub />
          </Suspense>
        } />
        <Route path="settings" element={
          <Suspense fallback={<LoadingFallback />}>
            <Settings />
          </Suspense>
        } />
        
        {/* Dynamic Game Routes registered via GameRegistry (OCP) */}
        {gameRegistry.getGames().map(game => (
          <Route
            key={game.id}
            path={game.route}
            element={
              <Suspense fallback={<LoadingFallback />}>
                {game.component}
              </Suspense>
            }
          />
        ))}

        {/* Dynamic Game Nested Routes (e.g. Melodiq Queue) */}
        {gameRegistry.getGames().flatMap(game => 
          (game.nestedRoutes || []).map(nr => (
            <Route
              key={`${game.id}-${nr.path}`}
              path={nr.path}
              element={
                <Suspense fallback={<LoadingFallback />}>
                  {nr.component}
                </Suspense>
              }
            />
          ))
        )}
      </Route>

      {/* Dynamic Standalone Routes (e.g. Melodiq TV Mode) */}
      {gameRegistry.getGames().flatMap(game => 
        (game.standaloneRoutes || []).map(sr => (
          <Route
            key={`${game.id}-${sr.path}`}
            path={sr.path}
            element={
              <Suspense fallback={<LoadingFallback />}>
                {sr.component}
              </Suspense>
            }
          />
        ))
      )}
    </Routes>
  );
}

function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AppRoutes />
    </Suspense>
  );
}

export default App;
