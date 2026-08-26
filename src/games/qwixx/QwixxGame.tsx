import React, { useReducer, useEffect, useState, useCallback } from 'react';
import {
    Box,
    Container,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Chip
} from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import CasinoIcon from '@mui/icons-material/Casino';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import { useTranslation } from 'react-i18next';
import { initQwixxI18n } from './i18n';
import { usePageTitle } from '../../context/TitleContext';
import { useWakeLock } from '../../hooks/useWakeLock';
import { storage } from '../../lib/storage';
import { qwixxReducer, INITIAL_STATE, createInitialSheet } from './logic/qwixxReducer';
import type { RowColor, DiceValues, PlayerSheet } from './logic/types';
import { QwixxSheet } from './components/QwixxSheet';
import { QwixxDiceRoller } from './components/QwixxDiceRoller';
import { QwixxOpponentView } from './components/QwixxOpponentView';

const STORAGE_KEY_SHEET = 'qwixx_my_sheet';
const STORAGE_KEY_SHOW_DICE = 'qwixx_show_dice';
const STORAGE_KEY_ROOM_ID = 'qwixx_room_id';

export const QwixxGame: React.FC = () => {
    initQwixxI18n();
    const { t } = useTranslation();
    usePageTitle(t('games.qwixx.title', 'Qwixx'));
    useWakeLock(true);

    const [state, dispatch] = useReducer(qwixxReducer, INITIAL_STATE, (initial) => {
        const savedSheet = storage.getJson<PlayerSheet | null>(STORAGE_KEY_SHEET, null);
        const savedRoomId = storage.get(STORAGE_KEY_ROOM_ID as any, '');
        return {
            ...initial,
            mySheet: savedSheet || createInitialSheet(),
            roomId: savedRoomId,
            isMultiplayer: !!savedRoomId
        };
    });

    const [showDice, setShowDice] = useState<boolean>(() => {
        return storage.get(STORAGE_KEY_SHOW_DICE as any, 'true') !== 'false';
    });

    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [roomDialogOpen, setRoomDialogOpen] = useState(false);
    const [roomInput, setRoomInput] = useState(state.roomId);
    const [nameInput, setNameInput] = useState(state.mySheet.name);

    // Save sheet state locally on changes
    useEffect(() => {
        storage.setJson(STORAGE_KEY_SHEET, state.mySheet);
    }, [state.mySheet]);

    // Save dice visibility toggle
    useEffect(() => {
        storage.set(STORAGE_KEY_SHOW_DICE as any, showDice ? 'true' : 'false');
    }, [showDice]);

    // BroadcastChannel sync across local tabs/devices in the same room
    useEffect(() => {
        if (!state.roomId) return;

        const channelName = `qwixx_room_${state.roomId}`;
        let channel: BroadcastChannel | null = null;
        try {
            channel = new BroadcastChannel(channelName);
            channel.onmessage = (event) => {
                const { type, payload } = event.data;
                if (type === 'SHEET_UPDATE' && payload.id !== state.mySheet.id) {
                    dispatch({ type: 'UPDATE_OPPONENT', sheet: payload });
                } else if (type === 'DICE_ROLL') {
                    dispatch({ type: 'SET_DICE', dice: payload });
                } else if (type === 'REQUEST_SHEET') {
                    // Send our sheet back to the newly joined peer
                    channel?.postMessage({ type: 'SHEET_UPDATE', payload: state.mySheet });
                }
            };

            // Announce presence and request other sheets
            channel.postMessage({ type: 'SHEET_UPDATE', payload: state.mySheet });
            channel.postMessage({ type: 'REQUEST_SHEET', payload: state.mySheet.id });
        } catch (e) {
            console.warn('[Qwixx] BroadcastChannel error:', e);
        }

        return () => {
            if (channel) {
                channel.close();
            }
        };
    }, [state.roomId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Broadcast sheet changes
    useEffect(() => {
        if (!state.roomId) return;
        try {
            const channel = new BroadcastChannel(`qwixx_room_${state.roomId}`);
            channel.postMessage({ type: 'SHEET_UPDATE', payload: state.mySheet });
            channel.close();
        } catch {}
    }, [state.mySheet, state.roomId]);

    const handleCrossNumber = useCallback((color: RowColor, number: number) => {
        dispatch({ type: 'CROSS_NUMBER', color, number });
    }, []);

    const handleLockRow = useCallback((color: RowColor) => {
        dispatch({ type: 'LOCK_ROW', color });
    }, []);

    const handleUnlockRow = useCallback((color: RowColor) => {
        dispatch({ type: 'UNLOCK_ROW', color });
    }, []);

    const handleAddMiss = useCallback(() => {
        dispatch({ type: 'ADD_MISS' });
    }, []);

    const handleRemoveMiss = useCallback(() => {
        dispatch({ type: 'REMOVE_MISS' });
    }, []);

    const handleRoll = useCallback((newDice: DiceValues) => {
        dispatch({ type: 'FINISH_ROLL', dice: newDice });
        if (state.roomId) {
            try {
                const channel = new BroadcastChannel(`qwixx_room_${state.roomId}`);
                channel.postMessage({ type: 'DICE_ROLL', payload: newDice });
                channel.close();
            } catch {}
        }
    }, [state.roomId]);

    const handleResetConfirm = () => {
        dispatch({ type: 'RESET_GAME' });
        setResetDialogOpen(false);
    };

    const handleSaveRoom = () => {
        const cleanRoom = roomInput.trim().toUpperCase();
        storage.set(STORAGE_KEY_ROOM_ID as any, cleanRoom);
        dispatch({ type: 'SET_ROOM_ID', roomId: cleanRoom });
        if (nameInput.trim() && nameInput.trim() !== state.mySheet.name) {
            dispatch({ type: 'SET_PLAYER_NAME', name: nameInput.trim() });
        }
        setRoomDialogOpen(false);
    };

    return (
        <Container maxWidth="md" sx={{ py: { xs: 1.5, sm: 3 }, px: { xs: 1, sm: 2 } }}>
            {/* Header Controls */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="h5" fontWeight="900" sx={{ background: 'linear-gradient(45deg, #ef5350, #fbc02d, #66bb6a, #42a5f5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {t('games.qwixx.title', 'QWIXX')}
                    </Typography>
                    <Chip
                        icon={state.isMultiplayer ? <GroupIcon /> : <PersonIcon />}
                        label={state.isMultiplayer ? `${t('games.qwixx.room_code', 'Room')}: ${state.roomId}` : t('games.qwixx.solo_mode', 'Solo')}
                        color={state.isMultiplayer ? 'primary' : 'default'}
                        onClick={() => {
                            setRoomInput(state.roomId);
                            setNameInput(state.mySheet.name);
                            setRoomDialogOpen(true);
                        }}
                        size="small"
                        clickable
                    />
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant={showDice ? 'contained' : 'outlined'}
                        size="small"
                        color="secondary"
                        startIcon={<CasinoIcon />}
                        onClick={() => setShowDice(!showDice)}
                    >
                        {showDice ? t('games.qwixx.hide_dice', 'Dice') : t('games.qwixx.show_dice', 'Dice')}
                    </Button>

                    <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        startIcon={<ReplayIcon />}
                        onClick={() => setResetDialogOpen(true)}
                    >
                        {t('games.qwixx.new_game', 'Reset')}
                    </Button>
                </Box>
            </Box>

            {/* Optional Dice Roller */}
            {showDice && (
                <QwixxDiceRoller
                    dice={state.dice}
                    isRolling={state.isRolling}
                    onRoll={handleRoll}
                />
            )}

            {/* Main Interactive Score Sheet */}
            <QwixxSheet
                sheet={state.mySheet}
                onCrossNumber={handleCrossNumber}
                onLockRow={handleLockRow}
                onUnlockRow={handleUnlockRow}
                onAddMiss={handleAddMiss}
                onRemoveMiss={handleRemoveMiss}
            />

            {/* Multiplayer Opponents View */}
            {state.isMultiplayer && (
                <QwixxOpponentView opponents={state.opponents} />
            )}

            {/* Reset Confirmation Dialog */}
            <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
                <DialogTitle>{t('games.qwixx.new_game', 'New Game')}</DialogTitle>
                <DialogContent>
                    <Typography variant="body1">
                        {t('games.qwixx.reset_confirm', 'Are you sure you want to reset your score sheet? All crosses will be cleared.')}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setResetDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                    <Button onClick={handleResetConfirm} color="error" variant="contained">{t('common.confirm', 'Reset')}</Button>
                </DialogActions>
            </Dialog>

            {/* Multiplayer Room Dialog */}
            <Dialog open={roomDialogOpen} onClose={() => setRoomDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{t('games.qwixx.multiplayer_mode', 'Multiplayer Room')}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField
                        fullWidth
                        label={t('games.qwixx.player_name', 'Your Name')}
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        size="small"
                    />
                    <TextField
                        fullWidth
                        label={t('games.qwixx.room_code', 'Room Code (leave empty for Solo)')}
                        value={roomInput}
                        onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                        placeholder="e.g. PARTY42"
                        size="small"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRoomDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                    <Button onClick={handleSaveRoom} variant="contained">{t('common.save', 'Save')}</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};
