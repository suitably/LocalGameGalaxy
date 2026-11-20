/**
 * A scripted card game in a party room [ID: COMP-TABLETOP-SCRIPT-ROOM]
 *
 * A device with a seat shows that player's hand and buttons; a device without one (the host as
 * table, spectators) shows the public table, made for casting to the TV.
 */
import React from 'react';
import { CircularProgress, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWakeLock } from '../../../../hooks/useWakeLock';
import { TvThemeProvider } from '../../../../components/common/TvThemeProvider';
import { useFollowPartyLobby } from '../../../../features/party/hooks/useFollowPartyLobby';
import { usePartyLobbyReturn } from '../../hooks/usePartyLobbyReturn';
import { newSeed } from '../../logic/rng';
import { getScript } from '../logic/scriptRegistry';
import { moveAllowed, sessionView } from '../logic/session';
import { useRoomSession } from '../hooks/useRoomSession';
import { useScriptedHeader } from '../hooks/useScriptedHeader';
import { CardTable } from './CardTable';
import { RoomSetup } from './RoomSetup';

export const RoomScriptedGame: React.FC<{ scriptId: string; roomId: string }> = ({
  scriptId,
  roomId,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const script = getScript(scriptId)!;
  useWakeLock(true);
  useFollowPartyLobby(roomId);
  const { returnToLobby } = usePartyLobbyReturn(roomId);
  const { room, state, dispatch, synced, seat } = useRoomSession(scriptId, roomId);
  const running = state.game !== null;
  const rules = useScriptedHeader({
    scriptId,
    // Guests visit the lobby while the game goes on; the host ends it for everyone.
    onBack: room.isHost ? returnToLobby : () => navigate(`/party?room=${roomId}`),
    onBackToLobby: room.isHost ? returnToLobby : undefined,
    onRestart: room.isHost && running ? () => dispatch({ type: 'END' }) : undefined,
  });

  if (!synced) {
    return (
      <Stack alignItems="center" py={6}>
        {rules}
        <CircularProgress />
      </Stack>
    );
  }
  const view = sessionView(state, seat);
  if (!view) {
    return (
      <>
        {rules}
        <RoomSetup
          script={script}
          roster={room.players}
          isHost={room.isHost}
          onStart={(players) => dispatch({ type: 'START', scriptId, players, seed: newSeed() })}
        />
      </>
    );
  }
  // A table without a seat acts for seat 0 where the script lets anyone (next round).
  const actor = seat ?? 0;
  const table = (
    <CardTable
      view={view}
      names={state.players.map((p) => p.name)}
      viewer={seat}
      step={state.step}
      allowed={(move) => moveAllowed(state, actor, move)}
      onMove={(move) => dispatch({ type: 'MOVE', seat: actor, move })}
      tableHint={t('games.tabletop.scripted.tableHint')}
    />
  );
  return (
    <>
      {rules}
      {seat === null ? <TvThemeProvider>{table}</TvThemeProvider> : table}
    </>
  );
};
