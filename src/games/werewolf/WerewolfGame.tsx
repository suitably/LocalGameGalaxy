import React, { useReducer, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { gameReducer } from './logic/gameReducer';
import { INITIAL_STATE } from './logic/types';
import type { Player } from './logic/types';
import { GameSetup } from './components/GameSetup';
import { RoleReveal } from './components/RoleReveal';
import { NightPhase } from './components/NightPhase';
import { DayPhase } from './components/DayPhase';
import { VotingPhase } from './components/VotingPhase';
import { GameOver } from './components/GameOver';
import { HunterShotView } from './components/HunterShotView';
import { ContinueGameDialog } from './components/ContinueGameDialog';
import { useGameStatePersistence } from './hooks/useGameStatePersistence';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/TitleContext';

const STORAGE_KEY_SETUP_PLAYERS = 'werewolf-setup-players';

export const WerewolfGame: React.FC = () => {
    const { t } = useTranslation();

    // Set the game title in the header
    usePageTitle(t('games.werewolf.title'));
    const { saveGameState, loadGameState, getSavedGameInfo, clearSavedGame, hasSavedGame } = useGameStatePersistence();

    const [showContinueDialog, setShowContinueDialog] = useState(false);
    const [savedGameInfo, setSavedGameInfo] = useState(getSavedGameInfo());

    // Initialize game state with persisted setup players
    const [gameState, dispatch] = useReducer(gameReducer, INITIAL_STATE, (initial) => {
        try {
            const savedPlayers = localStorage.getItem(STORAGE_KEY_SETUP_PLAYERS);
            if (savedPlayers) {
                const players = JSON.parse(savedPlayers);
                return { ...initial, players };
            }
        } catch { }
        return initial;
    });
    const [isInitialized, setIsInitialized] = useState(false);

    // Check for saved game on mount
    useEffect(() => {
        // Load custom roles from library storage (independent of game session)
        try {
            const savedCustomRoles = localStorage.getItem('werewolf-custom-roles');
            if (savedCustomRoles) {
                const roles = JSON.parse(savedCustomRoles);
                dispatch({ type: 'SAVE_CUSTOM_ROLES', roles });
            }
        } catch (e) {
            console.error('Failed to load custom roles library', e);
        }

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

    // Persist setup players when in SETUP phase
    useEffect(() => {
        if (gameState.phase === 'SETUP') {
            localStorage.setItem(STORAGE_KEY_SETUP_PLAYERS, JSON.stringify(gameState.players));
        }
    }, [gameState.players, gameState.phase]);

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

    const handleClearAllPlayers = () => {
        dispatch({ type: 'CLEAR_ALL_PLAYERS' });
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
                    customRoles={gameState.customRoles}
                    onAddPlayer={(name) => dispatch({ type: 'ADD_PLAYER', name })}
                    onRemovePlayer={(id) => dispatch({ type: 'REMOVE_PLAYER', id })}
                    onClearAllPlayers={handleClearAllPlayers}
                    onStartGame={(roles) => dispatch({ type: 'START_GAME', roles })}
                    onSaveCustomRoles={(roles) => {
                        dispatch({ type: 'SAVE_CUSTOM_ROLES', roles });
                        localStorage.setItem('werewolf-custom-roles', JSON.stringify(roles));
                    }}
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
                    customRoles={gameState.customRoles}
                    round={gameState.round}
                    nightActionLog={gameState.nightActionLog}
                    onNextPhase={() => dispatch({ type: 'NEXT_PHASE' })}
                    onNightAction={(action, role) => dispatch({ type: 'NIGHT_ACTION', action, role })}
                />
            )}

            {gameState.phase === 'DAY' && (
                <DayPhase
                    players={gameState.players}
                    round={gameState.round}
                    customRoles={gameState.customRoles}
                    onNextPhase={() => dispatch({ type: 'NEXT_PHASE' })}
                    removedPlayerIds={gameState.players.filter((p: Player) => !p.isAlive && gameState.nightActionLog.includes(p.id)).map((p: Player) => p.id)}
                    nightDecisions={gameState.nightDecisions}
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

            {gameState.phase === 'HUNTER_SHOT' && (
                <HunterShotView
                    hunter={gameState.players.find((p: Player) => p.id === gameState.pendingHunterIds[0])!}
                    players={gameState.players}
                    onShot={(targetId) => dispatch({ type: 'HUNTER_SHOT', targetId })}
                    onSkip={() => dispatch({ type: 'HUNTER_SHOT', targetId: '' })}
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
