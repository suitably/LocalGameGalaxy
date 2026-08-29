import React, { useReducer, useEffect, useState, useCallback, useRef } from 'react';
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
    Chip,
    Tooltip
} from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import CasinoIcon from '@mui/icons-material/Casino';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import StyleIcon from '@mui/icons-material/Style';
import { useTranslation } from 'react-i18next';
import { initQwixxI18n } from './i18n';
import { usePageTitle } from '../../context/TitleContext';
import { useWakeLock } from '../../hooks/useWakeLock';
import { storage } from '../../lib/storage';
import { qwixxReducer, INITIAL_STATE } from './logic/qwixxReducer';
import { computeHighlightedNumbers } from './logic/diceHighlight';
import { getSheetDefinition, ALL_SHEET_TYPES, generateRandomSheetRows } from './logic/sheetDefinitions';
import type { DieKey } from './logic/diceHighlight';
import type { RowColor, DiceValues, PlayerSheet, QwixxSheetType, SheetRowDefinition } from './logic/types';
import { QwixxSheet } from './components/QwixxSheet';
import { QwixxDiceRoller } from './components/QwixxDiceRoller';
import { QwixxOpponentView } from './components/QwixxOpponentView';
import { QwixxSheetSelector } from './components/QwixxSheetSelector';

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
        const savedRoom = storage.get(STORAGE_KEY_ROOM_ID, '');

        let mySheet = initial.mySheet;
        if (savedSheet) {
            mySheet = savedSheet;
        }

        return {
            ...initial,
            mySheet,
            roomId: savedRoom,
            isMultiplayer: !!savedRoom
        };
    });

    const [showDice, setShowDice] = useState<boolean>(() => storage.get(STORAGE_KEY_SHOW_DICE, 'false') === 'true');
    const [selectedDie, setSelectedDie] = useState<DieKey | null>(null);
    const [highlightedNumbers, setHighlightedNumbers] = useState<Partial<Record<RowColor, number[]>> | null>(null);
    const [resetDialogOpen, setResetDialogOpen] = useState<boolean>(false);
    const [roomDialogOpen, setRoomDialogOpen] = useState<boolean>(false);
    const [sheetSelectorOpen, setSheetSelectorOpen] = useState<boolean>(false);
    const [roomInput, setRoomInput] = useState<string>(state.roomId);
    const [nameInput, setNameInput] = useState<string>(state.mySheet.name);

    const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Save to storage
    useEffect(() => {
        storage.setJson(STORAGE_KEY_SHEET, state.mySheet);
    }, [state.mySheet]);

    useEffect(() => {
        storage.set(STORAGE_KEY_SHOW_DICE, String(showDice));
    }, [showDice]);

    useEffect(() => {
        storage.set(STORAGE_KEY_ROOM_ID, state.roomId);
    }, [state.roomId]);

    // Broadcast channel setup
    useEffect(() => {
        if (!state.roomId) return;

        let channel: BroadcastChannel | null = null;
        try {
            channel = new BroadcastChannel(`qwixx_room_${state.roomId}`);

            channel.onmessage = (event) => {
                const { type, payload } = event.data || {};
                if (type === 'SHEET_UPDATE' && payload && payload.id !== state.mySheet.id) {
                    dispatch({ type: 'UPDATE_OPPONENT', sheet: payload });
                } else if (type === 'DICE_ROLL' && payload) {
                    dispatch({ type: 'SET_DICE', dice: payload });
                } else if (type === 'REQUEST_SHEET' && payload !== state.mySheet.id) {
                    channel?.postMessage({ type: 'SHEET_UPDATE', payload: state.mySheet });
                }
            };

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

    const handleCrossNumber = useCallback((color: RowColor, number: number, isBonusRow?: boolean, rowId?: string) => {
        dispatch({ type: 'CROSS_NUMBER', color, number, isBonusRow, rowId });
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

    const handleSelectSheet = useCallback((sheetType: QwixxSheetType, presetIndex?: number, customRows?: SheetRowDefinition[]) => {
        dispatch({ type: 'CHANGE_SHEET_TYPE', sheetType, presetIndex, customRows });
        setSelectedDie(null);
        setHighlightedNumbers(null);
    }, []);

    const handlePickRandomSheet = useCallback(() => {
        const otherTypes = ALL_SHEET_TYPES.filter((t) => t !== state.mySheet.sheetType);
        const randomType = otherTypes[Math.floor(Math.random() * otherTypes.length)] || ALL_SHEET_TYPES[0];
        const def = getSheetDefinition(randomType);
        const randomPreset = def.presets ? Math.floor(Math.random() * def.presets.length) : 0;
        const customRows = randomType === 'random_mix' ? generateRandomSheetRows() : undefined;

        handleSelectSheet(randomType, randomPreset, customRows);
    }, [state.mySheet.sheetType, handleSelectSheet]);

    const handleRoll = useCallback((newDice: DiceValues) => {
        dispatch({ type: 'FINISH_ROLL', dice: newDice });
        setSelectedDie(null);
        setHighlightedNumbers(null);
        if (highlightTimerRef.current) {
            clearTimeout(highlightTimerRef.current);
            highlightTimerRef.current = null;
        }
        if (state.roomId) {
            try {
                const channel = new BroadcastChannel(`qwixx_room_${state.roomId}`);
                channel.postMessage({ type: 'DICE_ROLL', payload: newDice });
                channel.close();
            } catch {}
        }
    }, [state.roomId]);

    const handleDieClick = useCallback((dieKey: DieKey) => {
        if (highlightTimerRef.current) {
            clearTimeout(highlightTimerRef.current);
            highlightTimerRef.current = null;
        }

        if (selectedDie === dieKey) {
            setSelectedDie(null);
            setHighlightedNumbers(null);
            return;
        }

        setSelectedDie(dieKey);
        const highlights = computeHighlightedNumbers(dieKey, state.dice, state.mySheet);
        setHighlightedNumbers(highlights);

        highlightTimerRef.current = setTimeout(() => {
            setSelectedDie(null);
            setHighlightedNumbers(null);
            highlightTimerRef.current = null;
        }, 5000);
    }, [selectedDie, state.dice, state.mySheet]);

    useEffect(() => {
        return () => {
            if (highlightTimerRef.current) {
                clearTimeout(highlightTimerRef.current);
            }
        };
    }, []);

    const handleResetConfirm = () => {
        dispatch({ type: 'RESET_GAME' });
        setSelectedDie(null);
        setHighlightedNumbers(null);
        setResetDialogOpen(false);
    };

    const handleSaveRoom = () => {
        if (roomInput.trim() !== state.roomId) {
            dispatch({ type: 'SET_ROOM_ID', roomId: roomInput.trim() });
        }
        if (nameInput.trim() && nameInput.trim() !== state.mySheet.name) {
            dispatch({ type: 'SET_PLAYER_NAME', name: nameInput.trim() });
        }
        setRoomDialogOpen(false);
    };

    const currentSheetDef = getSheetDefinition(state.mySheet.sheetType || 'classic');

    return (
        <Container maxWidth="md" sx={{ py: { xs: 1.5, sm: 3 }, px: { xs: 1, sm: 2 } }}>
            {/* Header Controls */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="h5" fontWeight="900" sx={{ background: 'linear-gradient(45deg, #ef5350, #fbc02d, #66bb6a, #42a5f5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {t('games.qwixx.title', 'QWIXX')}
                    </Typography>

                    {/* Sheet Variant Selector Chip */}
                    <Chip
                        icon={<StyleIcon />}
                        label={t(currentSheetDef.nameKey)}
                        color="secondary"
                        variant="filled"
                        onClick={() => setSheetSelectorOpen(true)}
                        size="small"
                        clickable
                        sx={{ fontWeight: 'bold' }}
                    />

                    {/* Direct Random Pick Button */}
                    <Tooltip title={t('games.qwixx.random_mode', 'Zufälliger Modus')}>
                        <Chip
                            icon={<CasinoIcon />}
                            label={t('games.qwixx.random_mode', 'Zufall')}
                            variant="outlined"
                            color="secondary"
                            onClick={handlePickRandomSheet}
                            size="small"
                            clickable
                            sx={{ fontWeight: 'bold' }}
                        />
                    </Tooltip>

                    {/* Solo/Room Chip */}
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
                    onDieClick={handleDieClick}
                    selectedDie={selectedDie}
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
                highlightedNumbers={highlightedNumbers}
            />

            {/* Multiplayer Opponents View */}
            {state.isMultiplayer && (
                <QwixxOpponentView
                    opponents={state.opponents}
                />
            )}

            {/* Reset Confirmation Dialog */}
            <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
                <DialogTitle>{t('games.qwixx.new_game', 'Neues Spiel')}</DialogTitle>
                <DialogContent>
                    <Typography>
                        {t('games.qwixx.reset_confirm', 'Möchtest du deinen Zettel wirklich zurücksetzen?')}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setResetDialogOpen(false)} color="inherit">
                        {t('common.cancel', 'Abbrechen')}
                    </Button>
                    <Button onClick={handleResetConfirm} color="error" variant="contained">
                        {t('games.qwixx.new_game', 'Zurücksetzen')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Room / Name Configuration Dialog */}
            <Dialog open={roomDialogOpen} onClose={() => setRoomDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{t('games.qwixx.multiplayer_mode', 'Mehrspieler-Raum')}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField
                        label={t('games.qwixx.player_name', 'Spielername')}
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        fullWidth
                        size="small"
                        autoFocus
                    />
                    <TextField
                        label={t('games.qwixx.room_code', 'Raum-Code')}
                        value={roomInput}
                        onChange={(e) => setRoomInput(e.target.value)}
                        placeholder="z.B. family-night"
                        helperText="Gib denselben Code ein wie deine Mitspieler im selben Netzwerk/Browser"
                        fullWidth
                        size="small"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRoomDialogOpen(false)} color="inherit">
                        {t('common.cancel', 'Abbrechen')}
                    </Button>
                    <Button onClick={handleSaveRoom} color="primary" variant="contained">
                        {t('common.save', 'Speichern')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Visual Sheet Selector Dialog */}
            <QwixxSheetSelector
                open={sheetSelectorOpen}
                currentSheetType={state.mySheet.sheetType}
                onSelectSheet={handleSelectSheet}
                onClose={() => setSheetSelectorOpen(false)}
            />
        </Container>
    );
};
