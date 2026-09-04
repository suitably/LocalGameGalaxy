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
    Chip,
    Tooltip
} from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import CasinoIcon from '@mui/icons-material/Casino';
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
import { QwixxSheetSelector } from './components/QwixxSheetSelector';

const STORAGE_KEY_SHEET = 'qwixx_my_sheet';
const STORAGE_KEY_SHOW_DICE = 'qwixx_show_dice';

// Initialize i18n bundles at module load time to prevent setState side-effects during render
initQwixxI18n();

export const QwixxGame: React.FC = () => {
    const { t } = useTranslation();
    usePageTitle(t('games.qwixx.title', 'Qwixx'));
    useWakeLock(true);

    const [state, dispatch] = useReducer(qwixxReducer, INITIAL_STATE, (initial) => {
        const savedSheet = storage.getJson<PlayerSheet | null>(STORAGE_KEY_SHEET, null);
        let mySheet = initial.mySheet;
        if (savedSheet && savedSheet.red && savedSheet.yellow && savedSheet.green && savedSheet.blue) {
            mySheet = {
                ...initial.mySheet,
                ...savedSheet,
                red: savedSheet.red?.crossed ? savedSheet.red : { crossed: [], isLocked: false },
                yellow: savedSheet.yellow?.crossed ? savedSheet.yellow : { crossed: [], isLocked: false },
                green: savedSheet.green?.crossed ? savedSheet.green : { crossed: [], isLocked: false },
                blue: savedSheet.blue?.crossed ? savedSheet.blue : { crossed: [], isLocked: false }
            };
        }

        return {
            ...initial,
            mySheet,
            roomId: '',
            isMultiplayer: false
        };
    });

    const [showDice, setShowDice] = useState<boolean>(() => storage.get(STORAGE_KEY_SHOW_DICE, 'false') === 'true');
    const [selectedDie, setSelectedDie] = useState<DieKey | null>(null);
    const [highlightedNumbers, setHighlightedNumbers] = useState<Partial<Record<RowColor, number[]>> | null>(null);
    const [resetDialogOpen, setResetDialogOpen] = useState<boolean>(false);
    const [sheetSelectorOpen, setSheetSelectorOpen] = useState<boolean>(false);

    const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Save to storage
    useEffect(() => {
        storage.setJson(STORAGE_KEY_SHEET, state.mySheet);
    }, [state.mySheet]);

    useEffect(() => {
        storage.set(STORAGE_KEY_SHOW_DICE, String(showDice));
    }, [showDice]);

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
    }, []);

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

    const currentSheetDef = getSheetDefinition(state.mySheet.sheetType || 'classic');

    return (
        <Container
            maxWidth="md"
            sx={{
                py: { xs: 1.5, sm: 3 },
                px: { xs: 1, sm: 2 },
                height: '100%',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch'
            }}
        >
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
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant={showDice ? 'contained' : 'outlined'}
                        size="small"
                        color="secondary"
                        startIcon={<CasinoIcon />}
                        onClick={() => setShowDice(!showDice)}
                    >
                        {showDice ? t('games.qwixx.hide_dice', 'Würfel') : t('games.qwixx.show_dice', 'Würfel')}
                    </Button>

                    <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        startIcon={<ReplayIcon />}
                        onClick={() => setResetDialogOpen(true)}
                    >
                        {t('games.qwixx.new_game', 'Neues Spiel')}
                    </Button>
                </Box>
            </Box>

            {/* Optional Virtual Dice Roller */}
            {showDice && (
                <QwixxDiceRoller
                    dice={state.dice}
                    isRolling={state.isRolling}
                    onRoll={handleRoll}
                    onDieClick={handleDieClick}
                    selectedDie={selectedDie}
                    maxDieValue={state.mySheet.sheetType === 'longo' ? 8 : 6}
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
