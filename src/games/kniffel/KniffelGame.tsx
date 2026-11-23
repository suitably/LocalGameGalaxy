import React, { useCallback, useReducer, useEffect, useState } from 'react';
import { alpha, Box, Typography, Button, IconButton, Tooltip } from '@mui/material';
import ReplayIcon from '@mui/icons-material/ReplayRounded';
import CasinoIcon from '@mui/icons-material/CasinoRounded';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/titleContextCore';
import { storage, STORAGE_KEYS } from '../../lib/storage';
import { GameLayout } from '../../components/Layout/GameLayout';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import UndoIcon from '@mui/icons-material/UndoRounded';
import { LocalPlayersButton, usePassAndPlayTurns } from '../../modules/pass-and-play';

import { kniffelReducer, INITIAL_KNIFFEL_STATE } from './logic/kniffelReducer';
import { evaluatePossibleScores } from './logic/kniffelScoring';
import type { KniffelState, KniffelCategory } from './logic/types';
import { KniffelBoard } from './components/KniffelBoard';
import { KniffelDiceRoller } from './components/KniffelDiceRoller';
import { initKniffelI18n } from './i18n';

initKniffelI18n();

export const KniffelGame: React.FC = () => {
  const { t } = useTranslation();
  usePageTitle(t('games.kniffel.title', 'Fünf Würfel'));

  const [state, dispatch] = useReducer(kniffelReducer, INITIAL_KNIFFEL_STATE, (initial) => {
    const saved = storage.getJson<KniffelState | null>(STORAGE_KEYS.KNIFFEL_CURRENT_GAME, null);
    if (saved && Array.isArray(saved.players) && saved.players.length > 0) {
      return { ...initial, ...saved };
    }
    return initial;
  });

  const [showDice, setShowDice] = useState<boolean>(
    () => storage.get(STORAGE_KEYS.KNIFFEL_SHOW_DICE, 'true') === 'true',
  );
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  useEffect(() => {
    storage.setJson(STORAGE_KEYS.KNIFFEL_CURRENT_GAME, state);
  }, [state]);

  useEffect(() => {
    storage.set(STORAGE_KEYS.KNIFFEL_SHOW_DICE, String(showDice));
  }, [showDice]);

  const handleRollDice = (newDice: number[]) => {
    dispatch({ type: 'ROLL_DICE', dice: newDice });
  };

  const handleToggleHold = (index: number) => {
    dispatch({ type: 'TOGGLE_HOLD_DIE', index });
  };

  const handleScoreCategory = (category: KniffelCategory, score: number) => {
    dispatch({ type: 'SCORE_CATEGORY', category, score });
  };

  const possibleScores = evaluatePossibleScores(state.dice);

  // One device for everyone: the turn moves on after scoring, the cover asks for the next player.
  const turns = usePassAndPlayTurns({
    players: state.players,
    activeIndex: state.activePlayerIndex,
    onSwitch: useCallback((index: number) => dispatch({ type: 'SWITCH_PLAYER', index }), []),
    onSetPlayers: useCallback((names: string[]) => dispatch({ type: 'SET_PLAYERS', names }), []),
  });

  return (
    <GameLayout maxWidth="md">
      {/* Header controls */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          mb: { xs: 1, sm: 1.5 },
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalPlayersButton onClick={turns.openPlayers} />
          <Tooltip title={t('games.kniffel.show_dice_tooltip', 'Virtuelle Würfel ein-/ausblenden')}>
            <Button
              variant={showDice ? 'contained' : 'outlined'}
              size="small"
              color="secondary"
              startIcon={<CasinoIcon />}
              aria-pressed={showDice}
              onClick={() => setShowDice((prev) => !prev)}
              sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none', minHeight: 44 }}
            >
              {showDice
                ? t('games.kniffel.hide_dice', 'Würfel ausblenden')
                : t('games.kniffel.show_dice', 'Würfel anzeigen')}
            </Button>
          </Tooltip>

          <Tooltip
            title={t('games.kniffel.undo_tooltip', 'Letzten Eintrag rückgängig machen')}
            describeChild
          >
            <span>
              <IconButton
                aria-label={t('games.kniffel.undo_tooltip', 'Letzten Eintrag rückgängig machen')}
                onClick={() => dispatch({ type: 'UNDO_MOVE' })}
                disabled={!state.moveHistory || state.moveHistory.length === 0 || state.isGameOver}
                color="inherit"
                sx={{
                  width: 44,
                  height: 44,
                  border: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.15)}`,
                  '&.Mui-disabled': { opacity: 0.35 },
                }}
              >
                <UndoIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={t('games.kniffel.new_game', 'Neues Spiel')}>
            <IconButton
              onClick={() => setResetDialogOpen(true)}
              color="inherit"
              aria-label={t('games.kniffel.new_game', 'Neues Spiel')}
              sx={{ width: 44, height: 44 }}
            >
              <ReplayIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Dice Roller */}
      {showDice && (
        <KniffelDiceRoller
          dice={state.dice}
          heldDice={state.heldDice}
          rollCount={state.rollCount}
          onRoll={handleRollDice}
          onToggleHold={handleToggleHold}
          disabled={state.isGameOver}
        />
      )}

      {/* Score Board */}
      <KniffelBoard
        players={state.players}
        activePlayerIndex={state.activePlayerIndex}
        possibleScores={possibleScores}
        rollCount={state.rollCount}
        onScoreCategory={handleScoreCategory}
        onSwitchPlayer={turns.switchTo}
        disabled={state.isGameOver}
        showDice={showDice}
      />

      {/* Game Over Message */}
      {state.isGameOver && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="h5" color="primary" fontWeight="bold">
            {t('games.kniffel.game_over', 'Spiel beendet!')}
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => dispatch({ type: 'NEW_GAME' })}
            sx={{ mt: 2 }}
          >
            {t('games.kniffel.play_again', 'Nochmal spielen')}
          </Button>
        </Box>
      )}

      {turns.overlay}

      {/* Reset confirmation modal */}
      <ConfirmDialog
        open={resetDialogOpen}
        title={t('games.kniffel.new_game', 'Neues Spiel')}
        message={t(
          'games.kniffel.new_game_confirm',
          'Möchtest du wirklich eine neue Runde starten? Der aktuelle Spielstand geht verloren.',
        )}
        confirmText={t('games.kniffel.new_game', 'Neustart')}
        onConfirm={() => {
          dispatch({ type: 'NEW_GAME' });
          setResetDialogOpen(false);
        }}
        onCancel={() => setResetDialogOpen(false)}
        confirmColor="warning"
      />
    </GameLayout>
  );
};
