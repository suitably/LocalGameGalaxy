import React, { Suspense, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Route, Routes, useLocation, type Location } from 'react-router-dom';
import { RouteActiveContext } from '../../context/routeActiveContext';
import { ErrorBoundary } from '../ErrorBoundary';
import type { GameDefinition } from '../../lib/catalog/types';
import { isOnRoute, keepAliveGames } from './keepAliveRoutes';

/**
 * One keep-alive game: mounted on its first visit, then only hidden. Its subtree keeps the
 * location of its last visit, so it does not react to the pages the user opens meanwhile.
 */
const KeptGame: React.FC<{ game: GameDefinition }> = ({ game }) => {
  const location = useLocation();
  const active = isOnRoute(game, location.pathname);
  const [kept, setKept] = useState<Location | null>(null);
  if (active && kept !== location) setKept(location);
  const shown = active ? location : kept;
  if (!shown) return null;

  return (
    <RouteActiveContext.Provider value={active}>
      <Box
        aria-hidden={!active}
        sx={{
          display: active ? 'flex' : 'none',
          flex: 1,
          overflow: 'hidden',
          flexDirection: 'column',
        }}
      >
        <Routes location={shown}>
          <Route
            path={`/${game.route}`}
            element={
              <ErrorBoundary componentName={game.id}>
                <Suspense
                  fallback={
                    <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
                      <CircularProgress />
                    </Box>
                  }
                >
                  {game.component}
                </Suspense>
              </ErrorBoundary>
            }
          />
        </Routes>
      </Box>
    </RouteActiveContext.Provider>
  );
};

/**
 * Games with `keepAlive` (#888): a running Melodiq session keeps its music, phones and TV while
 * the host opens the hub, the settings or another page. `App.tsx` registers their routes with
 * no element; they render here, next to the layout's outlet.
 */
export const KeepAliveGames: React.FC = () => (
  <>
    {keepAliveGames().map((game) => (
      <KeptGame key={game.id} game={game} />
    ))}
  </>
);
