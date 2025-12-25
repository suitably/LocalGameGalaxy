import React, { useState, useCallback, useEffect } from 'react';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { GameSetup } from './components/GameSetup';
import { HandoverView } from './components/HandoverView';
import { GameTimer } from './components/GameTimer';
import { VotingView } from './components/VotingView';
import type { Player, GameState, Category } from './logic/types';
import ReplayIcon from '@mui/icons-material/Replay';
import HomeIcon from '@mui/icons-material/Home';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY_PLAYERS = 'imposter-setup-players';

export const ImposterGame: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();

    // Load players from localStorage on init
    const [players, setPlayers] = useState<Player[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_PLAYERS);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Save players to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(players));
    }, [players]);
    const [gameState, setGameState] = useState<GameState>({
        phase: 'LOBBY',
        players: [],
        selectedCategories: [],
        selectedWord: null,
        selectedHint: null,
        imposterCount: 1,
        timerLength: 300,
        remainingTime: 300,
        isPaused: false,
        currentPlayerIndex: 0,
        winner: null,
    });

    const addPlayer = useCallback((name: string) => {
        setPlayers(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name, isImposter: false, isKicked: false }]);
    }, []);

    const removePlayer = useCallback((id: string) => {
        setPlayers(prev => prev.filter(p => p.id !== id));
    }, []);

    const startGame = (setup: { categories: Category[]; imposterCount: number; timerLength: number }) => {
        // Pool words/hints from all selected categories
        const wordPool = setup.categories.flatMap(cat => cat.words);
        if (wordPool.length === 0) return;

        const randomWordObj = wordPool[Math.floor(Math.random() * wordPool.length)];
        const currentLang = i18n.language.startsWith('de') ? 'de' : 'en';

        const shuffled = [...players].sort(() => 0.5 - Math.random());
        const imposterIds = new Set(shuffled.slice(0, setup.imposterCount).map(p => p.id));

        const updatedPlayers = players.map(p => ({
            ...p,
            isImposter: imposterIds.has(p.id),
            isKicked: false
        }));

        setGameState({
            ...gameState,
            phase: 'HANDOVER',
            players: updatedPlayers,
            selectedCategories: setup.categories,
            selectedWord: randomWordObj[currentLang],
            selectedHint: randomWordObj.hint[currentLang],
            imposterCount: setup.imposterCount,
            timerLength: setup.timerLength,
            remainingTime: setup.timerLength,
            currentPlayerIndex: 0,
            winner: null
        });
    };

    const nextHandover = () => {
        if (gameState.currentPlayerIndex < gameState.players.length - 1) {
            setGameState(prev => ({ ...prev, currentPlayerIndex: prev.currentPlayerIndex + 1 }));
        } else {
            setGameState(prev => ({ ...prev, phase: 'TIMER' }));
        }
    };

    const handleKick = (playerId: string) => {
        const kickedPlayer = gameState.players.find(p => p.id === playerId);
        const winners = kickedPlayer?.isImposter ? 'NORMAL' : 'IMPOSTERS';

        setGameState(prev => ({
            ...prev,
            phase: 'RESULT',
            players: prev.players.map(p => p.id === playerId ? { ...p, isKicked: true } : p),
            winner: winners as 'IMPOSTERS' | 'NORMAL'
        }));
    };

    const resetGame = () => {
        setGameState({
            phase: 'LOBBY',
            players: [],
            selectedCategories: [],
            selectedWord: null,
            selectedHint: null,
            imposterCount: 1,
            timerLength: 300,
            remainingTime: 300,
            isPaused: false,
            currentPlayerIndex: 0,
            winner: null,
        });
    };

    const renderPhase = () => {
        switch (gameState.phase) {
            case 'LOBBY':
                return (
                    <GameSetup
                        players={players}
                        onAddPlayer={addPlayer}
                        onRemovePlayer={removePlayer}
                        onClearAllPlayers={() => setPlayers([])}
                        onStartGame={startGame}
                    />
                );
            case 'HANDOVER': {
                const currentPlayer = gameState.players[gameState.currentPlayerIndex];
                return (
                    <HandoverView
                        key={currentPlayer.id}
                        playerName={currentPlayer.name}
                        isImposter={currentPlayer.isImposter}
                        word={gameState.selectedWord || ''}
                        hint={gameState.selectedHint || ''}
                        onConfirmed={nextHandover}
                    />
                );
            }
            case 'TIMER':
                return (
                    <GameTimer
                        timerLength={gameState.timerLength}
                        onTimeUp={() => setGameState(prev => ({ ...prev, phase: 'VOTING' }))}
                        onEndEarly={() => setGameState(prev => ({ ...prev, phase: 'VOTING' }))}
                    />
                );
            case 'VOTING':
                return (
                    <VotingView
                        players={gameState.players}
                        onSelectPlayer={handleKick}
                    />
                );
            case 'RESULT': {
                const kickedOne = gameState.players.find(p => p.isKicked);
                const roleText = kickedOne?.isImposter
                    ? t('games.imposter.result.imposter')
                    : t('games.imposter.result.normal');

                return (
                    <Box sx={{ textAlign: 'center', py: 5 }}>
                        <Paper sx={{ p: 4, mb: 4, bgcolor: gameState.winner === 'NORMAL' ? 'success.light' : 'error.light' }}>
                            <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
                                {gameState.winner === 'NORMAL'
                                    ? t('games.imposter.result.innocents_win')
                                    : t('games.imposter.result.imposters_win')}
                            </Typography>
                            <Typography variant="h6">
                                {t('games.imposter.result.revealed_role', {
                                    name: kickedOne?.name,
                                    role: roleText
                                })}
                            </Typography>
                        </Paper>

                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<ReplayIcon />}
                                onClick={resetGame}
                            >
                                {t('games.werewolf.play_again')}
                            </Button>
                            <Button
                                variant="outlined"
                                size="large"
                                startIcon={<HomeIcon />}
                                onClick={() => navigate('/')}
                            >
                                {t('common.back')}
                            </Button>
                        </Box>
                    </Box>
                );
            }
            default:
                return null;
        }
    };

    return (
        <Container maxWidth="md">
            <Box sx={{ py: 4 }}>
                {renderPhase()}
            </Box>
        </Container>
    );
};
