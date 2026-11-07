/**
 * Knister for a device that is not in the game [ID: GAME-KNISTER-SPECTATOR]
 *
 * Pick a player and watch their sheet fill up with the shared rolls, read-only (#659).
 */
import React from 'react';
import { Typography } from '@mui/material';
import { SpectatorPlayerPicker } from '../../../components/games/SpectatorPlayerPicker';
import { useSpectatorSelection } from '../../../hooks/useSpectatorSelection';
import type { KnisterRoomState } from '../logic/knisterRoom';
import { calculateBoardScores } from '../logic/knisterScoring';
import { KnisterBoard } from './KnisterBoard';

export const KnisterSpectatorView: React.FC<{ state: KnisterRoomState }> = ({ state }) => {
  const { watched, watch } = useSpectatorSelection(state.players.map((p) => p.id));
  const player = state.players.find((p) => p.id === watched);
  const roll = state.currentRoll;
  return (
    <>
      <SpectatorPlayerPicker
        players={state.players.map((p) => ({
          id: p.id,
          name: `${p.name} · ${calculateBoardScores(p.grid).totalScore}`,
        }))}
        watched={watched}
        onWatch={watch}
        doneIds={roll ? state.placed : []}
      />
      {roll && (
        <Typography textAlign="center" fontWeight={800} variant="h5" mb={1}>
          {roll.die1} + {roll.die2} = {roll.sum}
        </Typography>
      )}
      {player && (
        <KnisterBoard grid={player.grid} currentSum={null} onCellClick={() => {}} disabled />
      )}
    </>
  );
};
