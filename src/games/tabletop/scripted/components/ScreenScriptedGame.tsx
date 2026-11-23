/**
 * The public table of a scripted room game for a TV [ID: COMP-TABLETOP-SCRIPT-SCREEN]
 *
 * Opened by URL (`role=screen`), not a party member and without a seat: it shows the table
 * the host publishes (no hands) and can never move.
 */
import React from 'react';
import { CircularProgress, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useWakeLock } from '../../../../hooks/useWakeLock';
import { TvThemeProvider } from '../../../../components/common/TvThemeProvider';
import { useScreenSession } from '../hooks/useScreenSession';
import { CardTable } from './CardTable';

const never = () => false;
const noMove = () => {};

export const ScreenScriptedGame: React.FC<{ scriptId: string; roomId: string }> = ({
  scriptId,
  roomId,
}) => {
  const { t } = useTranslation();
  useWakeLock(true);
  const { packet, synced } = useScreenSession(scriptId, roomId);
  return (
    <TvThemeProvider>
      {!synced || !packet || !packet.view ? (
        <Stack alignItems="center" py={6}>
          <CircularProgress />
        </Stack>
      ) : (
        <CardTable
          view={packet.view}
          names={packet.players.map((p) => p.name)}
          viewer={null}
          step={packet.step}
          allowed={never}
          onMove={noMove}
          tableHint={t('games.tabletop.scripted.tableHint')}
        />
      )}
    </TvThemeProvider>
  );
};
