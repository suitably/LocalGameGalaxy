/**
 * Read-only table for a TV (`role=screen`) [ID: COMP-TABLETOP-SCREEN]
 *
 * Opened by URL on a TV browser while the host plays on a phone. It follows the host's state as
 * a seatless spectator (only public, redacted hands), and the editor gets a dispatch that drops
 * everything, so nothing on the screen can change the table or diverge from the host.
 */
import React from 'react';
import { Box } from '@mui/material';
import { TvThemeProvider } from '../../../../components/common/TvThemeProvider';
import { useWakeLock } from '../../../../hooks/useWakeLock';
import type { TabletopGameState } from '../../logic/tabletopReducer';
import { TabletopEditor } from '../editor/TabletopEditor';
import { TableGameMenu } from './TableGameMenu';
import type { TableOrigin } from '../../logic/gameSource';

const ignore = () => {};

interface TabletopScreenViewProps {
  state: TabletopGameState;
  origin: TableOrigin | null;
}

export const TabletopScreenView: React.FC<TabletopScreenViewProps> = ({ state, origin }) => {
  useWakeLock(true);
  return (
    <TvThemeProvider>
      <Box position="relative" width="100%" height="100%">
        <TableGameMenu game={state.game} origin={origin} />
        <TabletopEditor state={state} dispatch={ignore} isTvMode />
      </Box>
    </TvThemeProvider>
  );
};
