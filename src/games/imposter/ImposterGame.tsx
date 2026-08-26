import React, { useState, useCallback, useEffect } from 'react';
import { Box, Typography, Button, Paper, IconButton, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { GameSetup } from './components/GameSetup';
import { HandoverView } from './components/HandoverView';
import { GameTimer } from './components/GameTimer';
import { VotingView } from './components/VotingView';
import { GameInfoDialog } from './components/GameInfoDialog';
import type { Player, GameState, DbCategory, DbWordPair } from './logic/types';
import ReplayIcon from '@mui/icons-material/Replay';
import HomeIcon from '@mui/icons-material/Home';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useNavigate } from 'react-router-dom';
import { seedImposterDatabase } from './logic/dbSeeder';
import { getWordPairsByCategories } from './logic/imposterRepository';
import { usePageTitle } from '../../context/TitleContext';
import { useWakeLock } from '../../hooks/useWakeLock';

import { storage, STORAGE_KEYS } from '../../lib/storage';

export const ImposterGame: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();

    // Set the game title in the header
    usePageTitle(t('games.imposter.title'));

    // Load lobby setup players from persistent storage on init
    const [lobbyPlayers, setLobbyPlayers] = useState<Player[]>(() => 
        storage.getJson<Player[]>(STORAGE_KEYS.IMPOSTER_SETUP_PLAYERS, [])
    );

    // Save lobby players to storage whenever they change
    useEffect(() => {
        storage.setJson(STORAGE_KEYS.IMPOSTER_SETUP_PLAYERS, lobbyPlayers);
    }, [lobbyPlayers]);

    const [isDbReady, setIsDbReady] = useState(false);

    // Initialize database
    useEffect(() => {
        const initDb = async () => {
            await seedImposterDatabase();
            setIsDbReady(true);
        };
        initDb();
    }, []);

    const [infoOpen, setInfoOpen] = useState(() => 
        storage.get(STORAGE_KEYS.IMPOSTER_SEEN_INFO) !== 'true'
    );

    const handleCloseInfo = useCallback(() => {
        setInfoOpen(false);
        storage.set(STORAGE_KEYS.IMPOSTER_SEEN_INFO, 'true');
    }, []);

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

    useWakeLock(gameState.phase !== 'LOBBY');

    const addPlayer = useCallback((name: string) => {
        setLobbyPlayers(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name, isImposter: false, isKicked: false }]);
    }, []);

    const removePlayer = useCallback((id: string) => {
        setLobbyPlayers(prev => prev.filter(p => p.id !== id));
    }, []);

    const startGame = async (setup: { categories: DbCategory[]; imposterCount: number; timerLength: number }) => {
        // Fetch word pairs from selected categories
        const categoryIds = setup.categories.map(c => c.id);
        const pairs = await getWordPairsByCategories(categoryIds);

        if (pairs.length === 0) return;

        const randomPair = pairs[Math.floor(Math.random() * pairs.length)] as DbWordPair;
        const currentLang = i18n.language.startsWith('de') ? 'de' : ('en' as 'en' | 'de');

        const [word, hint] = randomPair.words[currentLang];

        const shuffled = [...lobbyPlayers].sort(() => 0.5 - Math.random());
        const imposterIds = new Set(shuffled.slice(0, setup.imposterCount).map(p => p.id));

        const updatedPlayers = lobbyPlayers.map(p => ({
            ...p,
            isImposter: imposterIds.has(p.id),
            isKicked: false
        }));

        setGameState({
            ...gameState,
            phase: 'HANDOVER',
            players: updatedPlayers,
            selectedCategories: setup.categories,
            selectedWord: word,
            selectedHint: hint,
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
                if (!isDbReady) {
                    return (
                        <Box display="flex" justifyContent="center" alignItems="center" py={10}>
                            <CircularProgress />
                        </Box>
                    );
                }
                return (
                    <GameSetup
                        players={lobbyPlayers}
                        onAddPlayer={addPlayer}
                        onRemovePlayer={removePlayer}
                        onClearAllPlayers={() => setLobbyPlayers([])}
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
                        <Paper sx={{ p: 5, mb: 4, borderRadius: 3, bgcolor: gameState.winner === 'NORMAL' ? 'rgba(56, 142, 60, 0.85)' : 'rgba(211, 47, 47, 0.85)', border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: 8, color: '#fff' }}>
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
        <Box sx={{ p: 2, height: '100%', overflow: 'auto', position: 'relative' }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
                <IconButton color="primary" onClick={() => setInfoOpen(true)} size="large">
                    <InfoOutlinedIcon fontSize="inherit" />
                </IconButton>
            </Box>
            <Box sx={{ py: 2, mt: 4 }}>
                {renderPhase()}
            </Box>
            <GameInfoDialog open={infoOpen} onClose={handleCloseInfo} />
        </Box>
    );
};
