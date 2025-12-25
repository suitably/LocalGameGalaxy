import React, { useReducer, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { gameReducer } from './logic/gameReducer';
import { INITIAL_STATE } from './logic/types';
import { GameSetup } from './components/GameSetup';
import { RoleReveal } from './components/RoleReveal';
import { NightPhase } from './components/NightPhase';
import { DayPhase } from './components/DayPhase';
import { VotingPhase } from './components/VotingPhase';
import { GameOver } from './components/GameOver';
import { ContinueGameDialog } from './components/ContinueGameDialog';
import { useGameStatePersistence } from './hooks/useGameStatePersistence';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/TitleContext';

export const WerewolfGame: React.FC = () => {
    const { t } = useTranslation();

    // Set the game title in the header
    usePageTitle(t('games.werewolf.title'));
    const { saveGameState, loadGameState, getSavedGameInfo, clearSavedGame, hasSavedGame } = useGameStatePersistence();

    const [showContinueDialog, setShowContinueDialog] = useState(false);
    const [savedGameInfo, setSavedGameInfo] = useState(getSavedGameInfo());
    const [gameState, dispatch] = useReducer(gameReducer, INITIAL_STATE);
    const [isInitialized, setIsInitialized] = useState(false);

    // Check for saved game on mount
    useEffect(() => {
        if (hasSavedGame()) {
            setSavedGameInfo(getSavedGameInfo());
            setShowContinueDialog(true);
        } else {
            setIsInitialized(true);
        }
    }, []);

    // Save game state whenever it changes (after initialization)
    useEffect(() => {
        if (isInitialized) {
            saveGameState(gameState);
        }
    }, [gameState, isInitialized, saveGameState]);

    const handleContinueGame = () => {
        const savedState = loadGameState();
        if (savedState) {
            dispatch({ type: 'RESTORE_STATE', state: savedState });
        }
        setShowContinueDialog(false);
        setIsInitialized(true);
    };

    const handleNewGame = () => {
        clearSavedGame();
        setShowContinueDialog(false);
        setIsInitialized(true);
    };

    return (
        <Box>
            <ContinueGameDialog
                open={showContinueDialog}
                savedGameInfo={savedGameInfo}
                onContinue={handleContinueGame}
                onNewGame={handleNewGame}
            />

            {gameState.phase === 'SETUP' && (
                <GameSetup
                    players={gameState.players}
                    onAddPlayer={(name) => dispatch({ type: 'ADD_PLAYER', name })}
                    onRemovePlayer={(id) => dispatch({ type: 'REMOVE_PLAYER', id })}
                    onStartGame={(roles, isNarratorMode) => dispatch({ type: 'START_GAME', roles, isNarratorMode })}
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
                    isNarratorMode={gameState.isNarratorMode}
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

            {gameState.phase === 'VOTING' && (
                <VotingPhase
                    players={gameState.players}
                    round={gameState.round}
                    onVote={(playerId) => dispatch({ type: 'KILL_PLAYER', id: playerId })}
                    onSkipVote={() => dispatch({ type: 'NEXT_PHASE' })}
                />
            )}

            {gameState.phase === 'GAME_OVER' && gameState.winner && (
                <GameOver
                    winner={gameState.winner}
                    onPlayAgain={() => dispatch({ type: 'RESET_GAME' })}
                />
            )}
        </Box>
    );
};
