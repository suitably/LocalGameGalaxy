import React from 'react';
import { Box } from '@mui/material';
import type { Player } from './logic/types';
import { GameSetup } from './components/GameSetup';
import { RoleReveal } from './components/RoleReveal';
import { NightPhase } from './components/NightPhase';
import { DayPhase } from './components/DayPhase';
import { VotingPhase } from './components/VotingPhase';
import { GameOver } from './components/GameOver';
import { HunterShotView } from './components/HunterShotView';
import { ContinueGameDialog } from './components/ContinueGameDialog';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/TitleContext';
import { WerewolfGameProvider, useWerewolfGame } from './context/WerewolfGameContext';
import { useWakeLock } from '../../hooks/useWakeLock';

const WerewolfGameContent: React.FC = () => {
    const { t } = useTranslation();
    usePageTitle(t('games.werewolf.title'));

    const {
        gameState,
        showContinueDialog,
        savedGameInfo,
        handleContinueGame,
        handleNewGame,
        addPlayer,
        removePlayer,
        clearAllPlayers,
        startGame,
        nextPhase,
        killPlayer,
        resetGame,
        saveCustomRoles,
        executeNightAction,
        executeHunterShot,
    } = useWerewolfGame();

    useWakeLock(gameState.phase !== 'SETUP');

    return (
        <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
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
                    onAddPlayer={addPlayer}
                    onRemovePlayer={removePlayer}
                    onClearAllPlayers={clearAllPlayers}
                    onStartGame={startGame}
                    onSaveCustomRoles={saveCustomRoles}
                />
            )}

            {gameState.phase === 'ROLE_REVEAL' && (
                <RoleReveal
                    players={gameState.players}
                    onComplete={nextPhase}
                />
            )}

            {gameState.phase === 'NIGHT' && (
                <NightPhase
                    players={gameState.players}
                    customRoles={gameState.customRoles}
                    round={gameState.round}
                    nightActionLog={gameState.nightActionLog}
                    onNextPhase={nextPhase}
                    onNightAction={executeNightAction}
                />
            )}

            {gameState.phase === 'DAY' && (
                <DayPhase
                    players={gameState.players}
                    round={gameState.round}
                    customRoles={gameState.customRoles}
                    onNextPhase={nextPhase}
                    removedPlayerIds={gameState.players.filter((p: Player) => !p.isAlive && gameState.nightActionLog.includes(p.id)).map((p: Player) => p.id)}
                    nightDecisions={gameState.nightDecisions}
                />
            )}

            {gameState.phase === 'VOTING' && (
                <VotingPhase
                    players={gameState.players}
                    round={gameState.round}
                    onVote={killPlayer}
                    onSkipVote={nextPhase}
                />
            )}

            {gameState.phase === 'HUNTER_SHOT' && (
                <HunterShotView
                    hunter={gameState.players.find((p: Player) => p.id === gameState.pendingHunterIds[0])!}
                    players={gameState.players}
                    onShot={executeHunterShot}
                    onSkip={() => executeHunterShot('')}
                />
            )}

            {gameState.phase === 'GAME_OVER' && gameState.winner && (
                <GameOver
                    winner={gameState.winner}
                    onPlayAgain={resetGame}
                />
            )}
        </Box>
    );
};

export const WerewolfGame: React.FC = () => {
    return (
        <WerewolfGameProvider>
            <WerewolfGameContent />
        </WerewolfGameProvider>
    );
};
