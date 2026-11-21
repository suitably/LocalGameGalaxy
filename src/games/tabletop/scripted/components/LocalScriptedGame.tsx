/**
 * A scripted card game on one device, passed around [ID: COMP-TABLETOP-SCRIPT-LOCAL]
 *
 * The screen is covered whenever another player has to act, so nobody sees a hand that is
 * not theirs; the round result is public.
 */
import React, { useEffect, useReducer, useState } from 'react';
import { Box, Button } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { STORAGE_KEYS } from '../../../../lib/storage';
import { pieceColorForSlot } from '../../../../themeTokens';
import { HandoverCover } from '../../../../modules/pass-and-play';
import { PlayerManagerCard, useLobbyPlayers } from '../../../../modules/player-management';
import { newSeed } from '../../logic/rng';
import { getScript } from '../logic/scriptRegistry';
import { moveAllowed, sessionReducer, sessionView } from '../logic/session';
import { loadSession, saveSession } from '../logic/sessionStore';
import { useScriptedHeader } from '../hooks/useScriptedHeader';
import { CardTable } from './CardTable';
import { ScriptOptionSwitches } from './ScriptOptionSwitches';
import type { ScriptOptions } from '../logic/scriptTypes';

const SCOPE = 'local';

export const LocalScriptedGame: React.FC<{ scriptId: string }> = ({ scriptId }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const script = getScript(scriptId)!;
  const [state, dispatch] = useReducer(sessionReducer, scriptId, (id) => loadSession(id, SCOPE));
  useEffect(() => saveSession(SCOPE, state), [state]);

  const lobby = useLobbyPlayers({
    storageKey: STORAGE_KEYS.TABLETOP_CARD_PLAYERS,
    defaultPlayers: ['Spieler 1', 'Spieler 2', 'Spieler 3'],
    minPlayers: script.minPlayers,
    maxPlayers: script.maxPlayers,
  });
  const running = state.game !== null;
  const rules = useScriptedHeader({
    scriptId,
    onBack: () => navigate('/games/tabletop'),
    onRestart: running ? () => dispatch({ type: 'END' }) : undefined,
  });

  const table = sessionView(state, null);
  const acting = table?.active[0] ?? null;
  const [viewer, setViewer] = useState(acting ?? 0);
  const [options, setOptions] = useState<ScriptOptions>({});

  if (!table) {
    const count = lobby.players.length;
    return (
      <Box sx={{ width: '100%', maxWidth: 560, mx: 'auto', p: 2, overflowY: 'auto' }}>
        {rules}
        <PlayerManagerCard
          players={lobby.players}
          onAddPlayer={lobby.addPlayer}
          onRemovePlayer={lobby.removePlayer}
          minPlayers={script.minPlayers}
          maxPlayers={script.maxPlayers}
          description={t('games.tabletop.scripted.setup.players', {
            min: script.minPlayers,
            max: script.maxPlayers,
          })}
          sx={{ mb: 2 }}
        />
        <ScriptOptionSwitches script={script} value={options} onChange={setOptions} />
        <Button
          variant="contained"
          size="large"
          fullWidth
          startIcon={<PlayArrowIcon />}
          disabled={count < script.minPlayers || count > script.maxPlayers}
          onClick={() => {
            dispatch({
              type: 'START',
              scriptId,
              seed: newSeed(),
              options,
              players: lobby.players.map((p, i) => ({ id: `p${i}`, name: p.name })),
            });
            setViewer(-1);
          }}
        >
          {t('games.tabletop.scripted.setup.start')}
        </Button>
      </Box>
    );
  }

  const names = state.players.map((p) => p.name);
  const handover = state.players.map((p, i) => ({ ...p, color: pieceColorForSlot(i) }));
  const covered = acting !== null && acting !== viewer;
  const seat = Math.max(0, viewer);
  return (
    <>
      {rules}
      {covered ? (
        <HandoverCover
          player={handover[acting]}
          players={[handover[acting]]}
          onReveal={() => setViewer(acting)}
          onRetarget={() => {}}
          onCancel={() => navigate('/games/tabletop')}
        />
      ) : (
        <CardTable
          view={sessionView(state, seat)!}
          names={names}
          viewer={seat}
          step={state.step}
          allowed={(move) => moveAllowed(state, seat, move)}
          onMove={(move) => dispatch({ type: 'MOVE', seat, move })}
        />
      )}
    </>
  );
};
