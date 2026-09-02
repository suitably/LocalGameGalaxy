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
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CasinoIcon from '@mui/icons-material/Casino';
import UndoIcon from '@mui/icons-material/Undo';
import { useTranslation } from 'react-i18next';
import { initKnisterI18n } from './i18n';
import { usePageTitle } from '../../context/TitleContext';
import { useWakeLock } from '../../hooks/useWakeLock';
import { storage } from '../../lib/storage';
import { knisterReducer, INITIAL_KNISTER_STATE } from './logic/knisterReducer';
import type { KnisterState } from './logic/types';
import { KnisterBoard } from './components/KnisterBoard';
import { KnisterDiceRoller } from './components/KnisterDiceRoller';
import { KnisterNumberBar } from './components/KnisterNumberBar';
import { KnisterNumberPickerModal } from './components/KnisterNumberPickerModal';
import { KnisterCombinationsLegend } from './components/KnisterCombinationsLegend';
import { KnisterGameOverModal } from './components/KnisterGameOverModal';

const STORAGE_KEY_KNISTER_STATE = 'knister_current_game';
const STORAGE_KEY_SHOW_DICE = 'knister_show_dice';

export const KnisterGame: React.FC = () => {
  initKnisterI18n();
  const { t } = useTranslation();
  usePageTitle(t('games.knister.title', 'Knister'));
  useWakeLock(true);

  const [state, dispatch] = useReducer(knisterReducer, INITIAL_KNISTER_STATE, (initial) => {
    const saved = storage.getJson<KnisterState | null>(STORAGE_KEY_KNISTER_STATE, null);
    if (saved && Array.isArray(saved.players) && saved.players.length > 0) {
      return {
        ...initial,
        ...saved,
        moveHistory: Array.isArray(saved.moveHistory) ? saved.moveHistory : [],
      };
    }
    return initial;
  });

  const [showDice, setShowDice] = useState<boolean>(() => storage.get(STORAGE_KEY_SHOW_DICE, 'true') === 'true');
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [pickerTargetCell, setPickerTargetCell] = useState<{ row: number; col: number } | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [gameOverModalOpen, setGameOverModalOpen] = useState(false);

  // Sync state to storage
  useEffect(() => {
    storage.setJson(STORAGE_KEY_KNISTER_STATE, state);
  }, [state]);

  // Sync showDice to storage
  useEffect(() => {
    storage.set(STORAGE_KEY_SHOW_DICE, String(showDice));
  }, [showDice]);

  // Open game over modal when game ends
  useEffect(() => {
    if (state.isGameOver) {
      setGameOverModalOpen(true);
    }
  }, [state.isGameOver]);

  const activePlayer = state.players[state.activePlayerIndex] || state.players[0];

  const handleRollDice = useCallback((d1: number, d2: number) => {
    setSelectedNumber(null);
    dispatch({ type: 'ROLL_DICE', die1: d1, die2: d2 });
  }, []);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (selectedNumber !== null) {
        dispatch({ type: 'PLACE_NUMBER', row, col, playerId: activePlayer.id, value: selectedNumber });
        setSelectedNumber(null);
      } else if (state.currentRoll !== null) {
        dispatch({ type: 'PLACE_NUMBER', row, col, playerId: activePlayer.id });
      }
    },
    [activePlayer.id, selectedNumber, state.currentRoll],
  );

  const handleOpenPicker = useCallback((row: number, col: number) => {
    setPickerTargetCell({ row, col });
  }, []);

  const handlePickerSelectNumber = useCallback(
    (num: number, row: number, col: number) => {
      dispatch({ type: 'PLACE_NUMBER', row, col, playerId: activePlayer.id, value: num });
      setSelectedNumber(null);
      setPickerTargetCell(null);
    },
    [activePlayer.id],
  );

  const handleUndo = useCallback(() => {
    dispatch({ type: 'UNDO_MOVE' });
    setSelectedNumber(null);
    setPickerTargetCell(null);
  }, []);

  const handleNewGame = useCallback(() => {
    dispatch({ type: 'NEW_GAME' });
    setSelectedNumber(null);
    setPickerTargetCell(null);
    setResetDialogOpen(false);
    setGameOverModalOpen(false);
  }, []);

  const hasActiveSum = state.currentRoll !== null || selectedNumber !== null;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 1.5, sm: 3 }, px: { xs: 1, sm: 2 } }}>
      {/* Header controls */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 900,
              fontSize: { xs: '1.6rem', sm: '2.1rem' },
              background: 'linear-gradient(90deg, #ffb74d, #f57c00)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {t('games.knister.title', 'Knister')}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Virtual Dice Toggle Button */}
          <Tooltip title={t('games.knister.show_dice_tooltip', 'Virtuelle Würfel ein-/ausblenden')}>
            <Button
              variant={showDice ? 'contained' : 'outlined'}
              size="small"
              color="secondary"
              startIcon={<CasinoIcon />}
              onClick={() => setShowDice((prev) => !prev)}
              sx={{ borderRadius: 50, fontWeight: 700, textTransform: 'none' }}
            >
              {showDice ? t('games.knister.hide_dice', 'Würfel') : t('games.knister.show_dice', 'Würfel')}
            </Button>
          </Tooltip>

          {/* Undo Button */}
          <Tooltip title={t('games.knister.undo_tooltip', 'Letzten Eintrag rückgängig machen')}>
            <span>
              <IconButton
                onClick={handleUndo}
                disabled={!state.moveHistory || state.moveHistory.length === 0 || state.isGameOver}
                color="inherit"
                size="small"
                sx={{
                  border: '1px solid rgba(255,255,255,0.15)',
                  '&.Mui-disabled': { opacity: 0.35 },
                }}
              >
                <UndoIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          {/* Rules / Legend Button */}
          <Tooltip title={t('games.knister.show_legend', 'Punkteübersicht')}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<HelpOutlineIcon />}
              onClick={() => setLegendOpen(true)}
              sx={{ borderRadius: 50, textTransform: 'none', borderColor: 'rgba(255,255,255,0.2)' }}
            >
              {t('games.knister.legend_title', 'Regeln')}
            </Button>
          </Tooltip>

          {/* Reset Game Button */}
          <Tooltip title={t('games.knister.new_game', 'Neues Spiel')}>
            <IconButton onClick={() => setResetDialogOpen(true)} color="inherit" size="small">
              <ReplayIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Players Tabs if multiple players */}
      {state.players.length > 1 && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
          <Tabs
            value={state.activePlayerIndex}
            onChange={(_, val) => dispatch({ type: 'SWITCH_PLAYER', index: val })}
            variant="scrollable"
            scrollButtons="auto"
          >
            {state.players.map((p, idx) => (
              <Tab key={p.id} label={`${idx + 1}. ${p.name}`} sx={{ textTransform: 'none', fontWeight: 700 }} />
            ))}
          </Tabs>
        </Box>
      )}

      {/* Optional Virtual Dice Roller (im selben Stil wie bei Qwixx) */}
      {showDice && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          <KnisterDiceRoller
            currentRoll={state.currentRoll}
            rollCount={state.rollCount}
            rollHistory={state.rollHistory}
            onRoll={handleRollDice}
            disabled={state.isGameOver}
          />
        </Box>
      )}

      {/* Number Selection Bar (2 to 12) for custom/physical dice */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
        <KnisterNumberBar
          selectedNumber={selectedNumber}
          onSelectNumber={(num) => setSelectedNumber(num)}
          disabled={state.isGameOver}
        />
      </Box>

      {/* 5x5 Board Section */}
      <KnisterBoard
        grid={activePlayer.grid}
        currentSum={state.currentRoll ? state.currentRoll.sum : null}
        selectedNumber={selectedNumber}
        targetPickerCell={pickerTargetCell}
        onCellClick={handleCellClick}
        onCellOpenPicker={hasActiveSum ? undefined : handleOpenPicker}
        disabled={state.isGameOver}
      />

      {/* Direct Cell Number Picker Modal (Numpad) */}
      <KnisterNumberPickerModal
        open={pickerTargetCell !== null}
        targetCell={pickerTargetCell}
        onSelectNumber={handlePickerSelectNumber}
        onClose={() => setPickerTargetCell(null)}
      />

      {/* Combinations Legend Dialog */}
      <KnisterCombinationsLegend open={legendOpen} onClose={() => setLegendOpen(false)} />

      {/* Game Over Modal */}
      <KnisterGameOverModal
        open={gameOverModalOpen}
        players={state.players}
        highScore={state.highScore}
        onNewGame={handleNewGame}
        onClose={() => setGameOverModalOpen(false)}
      />

      {/* Reset confirmation modal */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        PaperProps={{ sx: { bgcolor: 'rgba(22, 22, 35, 0.98)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)' } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>{t('games.knister.new_game', 'Neues Spiel')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t('games.knister.new_game_confirm', 'Möchtest du wirklich eine neue Runde starten? Der aktuelle Spielstand geht verloren.')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setResetDialogOpen(false)} variant="text" sx={{ color: 'text.secondary' }}>
            {t('common.cancel', 'Abbrechen')}
          </Button>
          <Button onClick={handleNewGame} variant="contained" color="warning" sx={{ borderRadius: 50 }}>
            {t('games.knister.new_game', 'Neustart')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
