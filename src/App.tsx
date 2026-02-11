import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { MainLayout } from './components/Layout/MainLayout';
import { Hub } from './features/hub/Hub';

// Lazy load game components to reduce initial bundle size
const WerewolfGame = lazy(() => import('./games/werewolf/WerewolfGame').then(m => ({ default: m.WerewolfGame })));
const ImposterGame = lazy(() => import('./games/imposter/ImposterGame').then(m => ({ default: m.ImposterGame })));
const MelodiqGame = lazy(() => import('./games/melodiq/MelodiqGame').then(m => ({ default: m.MelodiqGame })));
const MelodiqPhoneClient = lazy(() => import('./games/melodiq/MelodiqPhoneClient').then(m => ({ default: m.MelodiqPhoneClient })));
const MelodiqQueue = lazy(() => import('./games/melodiq/components/MelodiqQueue').then(m => ({ default: m.MelodiqQueue })));

// Loading fallback component
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

import { SongsProvider } from './games/melodiq/hooks/useSongs';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Hub />} />
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
        <Route path="games/melodiq/phone" element={
          <Suspense fallback={<LoadingFallback />}>
            <MelodiqPhoneClient />
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
    </Routes>
  );
}

export default App;
