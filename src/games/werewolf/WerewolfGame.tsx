import React, { useReducer } from 'react';
import { Box, Typography } from '@mui/material';
import { gameReducer } from './logic/gameReducer';
import { INITIAL_STATE } from './logic/types';
import { GameSetup } from './components/GameSetup';
import { RoleReveal } from './components/RoleReveal';
import { NightPhase } from './components/NightPhase';
import { DayPhase } from './components/DayPhase';
import { useTranslation } from 'react-i18next';

export const WerewolfGame: React.FC = () => {
    const { t } = useTranslation();
    const [gameState, dispatch] = useReducer(gameReducer, INITIAL_STATE);

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
                {t('games.werewolf.title')}
            </Typography>

            {gameState.phase === 'SETUP' && (
                <GameSetup
                    players={gameState.players}
                    onAddPlayer={(name) => dispatch({ type: 'ADD_PLAYER', name })}
                    onRemovePlayer={(id) => dispatch({ type: 'REMOVE_PLAYER', id })}
                    onStartGame={(roles) => dispatch({ type: 'START_GAME', roles })}
                />
            )}

            {gameState.phase === 'ROLE_REVEAL' && (
                <RoleReveal
                    players={gameState.players}
                    onComplete={() => dispatch({ type: 'NEXT_PHASE' })}
                />
            )}

            {gameState.phase === 'NIGHT' && (
                <NightPhase
                    players={gameState.players}
                    round={gameState.round}
                    onNextPhase={() => dispatch({ type: 'NEXT_PHASE' })}
                    onNightAction={(targetId) => dispatch({ type: 'KILL_PLAYER', id: targetId })}
                />
            )}

            {gameState.phase === 'DAY' && (
                <DayPhase
                    players={gameState.players}
                    round={gameState.round}
                    onNextPhase={() => dispatch({ type: 'NEXT_PHASE' })}
                    removedPlayerIds={gameState.players.filter((p: { isAlive: boolean; id: string }) => !p.isAlive && gameState.nightActionLog.includes(p.id)).map((p: { id: string }) => p.id)} // Mock logic for now
                />
            )}
        </Box>
    );
};
