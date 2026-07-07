import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { App as CapacitorApp } from '@capacitor/app';
import { MainLayout } from './components/Layout/MainLayout';

// Lazy load game components to reduce initial bundle size
const Hub = lazy(() => import('./features/hub/Hub').then(m => ({ default: m.Hub })));
const Settings = lazy(() => import('./features/settings/Settings').then(m => ({ default: m.Settings })));
const WerewolfGame = lazy(() => import('./games/werewolf/WerewolfGame').then(m => ({ default: m.WerewolfGame })));
const ImposterGame = lazy(() => import('./games/imposter/ImposterGame').then(m => ({ default: m.ImposterGame })));
const MelodiqGame = lazy(() => import('./games/melodiq/MelodiqGame').then(m => ({ default: m.MelodiqGame })));
// MelodiqPhoneClient has been deprecated and merged into MelodiqGame
const MelodiqQueue = lazy(() => import('./games/melodiq/components/MelodiqQueue').then(m => ({ default: m.MelodiqQueue })));
const MelodiqTV = lazy(() => import('./games/melodiq/MelodiqTV').then(m => ({ default: m.MelodiqTV })));

// Loading fallback component
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

import { SongsProvider } from './games/melodiq/hooks/useSongs';

// Inner component to use navigation hook
function AppRoutes() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleBackButton = () => {
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
        <Route path="games/werewolf" element={
          <Suspense fallback={<LoadingFallback />}>
            <WerewolfGame />
          </Suspense>
        } />
        <Route path="games/imposter" element={
          <Suspense fallback={<LoadingFallback />}>
            <ImposterGame />
          </Suspense>
        } />
        <Route path="games/melodiq" element={
          <Suspense fallback={<LoadingFallback />}>
            <MelodiqGame />
          </Suspense>
        } />

        <Route path="games/melodiq/queue" element={
          <Suspense fallback={<LoadingFallback />}>
            <SongsProvider>
              <MelodiqQueue />
            </SongsProvider>
          </Suspense>
        } />
      </Route>
      <Route path="/games/melodiq/tv" element={
        <Suspense fallback={<LoadingFallback />}>
          <MelodiqTV />
        </Suspense>
      } />
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
