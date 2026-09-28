import React, { useReducer, useEffect, useState } from 'react';
import { Box, Typography, Button, IconButton, Tabs, Tab, Tooltip } from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../../context/TitleContext';
import { storage } from '../../../lib/storage';
import { GameLayout } from '../../../components/Layout/GameLayout';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';

import { kniffelReducer, INITIAL_KNIFFEL_STATE } from '../logic/kniffelReducer';
import { evaluatePossibleScores } from '../logic/kniffelScoring';
import type { KniffelState, KniffelCategory } from '../logic/types';
import { KniffelBoard } from './KniffelBoard';
import { KniffelDiceRoller } from './KniffelDiceRoller';
import { initKniffelI18n } from '../i18n';

const STORAGE_KEY_KNIFFEL_STATE = 'kniffel_current_game';

initKniffelI18n();

export const KniffelGame: React.FC = () => {
  const { t } = useTranslation();
  usePageTitle(t('games.kniffel.title', 'Kniffel'));

  const [state, dispatch] = useReducer(kniffelReducer, INITIAL_KNIFFEL_STATE, (initial) => {
    const saved = storage.getJson<KniffelState | null>(STORAGE_KEY_KNIFFEL_STATE, null);
    if (saved && Array.isArray(saved.players) && saved.players.length > 0) {
      return { ...initial, ...saved };
    }
    return initial;
  });

  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  useEffect(() => {
    storage.setJson(STORAGE_KEY_KNIFFEL_STATE, state);
  }, [state]);

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

  return (
    <GameLayout maxWidth="md">
      {/* Header controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 900,
            fontSize: { xs: '1.6rem', sm: '2.1rem' },
            background: 'linear-gradient(90deg, #ef4444, #991b1b)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {t('games.kniffel.title', 'Kniffel')}
        </Typography>

        <Tooltip title={t('games.kniffel.new_game', 'Neues Spiel')}>
          <IconButton onClick={() => setResetDialogOpen(true)} color="inherit" size="small">
            <ReplayIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Players Tabs */}
      {state.players.length > 1 && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs
            value={state.activePlayerIndex}
            onChange={(_, val) => dispatch({ type: 'SWITCH_PLAYER', index: val })}
            variant="scrollable"
            scrollButtons="auto"
          >
            {state.players.map((p, idx) => (
              <Tab
                key={p.id}
                label={`${idx + 1}. ${p.name}`}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              />
            ))}
          </Tabs>
        </Box>
      )}

      {/* Dice Roller */}
      <KniffelDiceRoller
        dice={state.dice}
        heldDice={state.heldDice}
        rollCount={state.rollCount}
        onRoll={handleRollDice}
        onToggleHold={handleToggleHold}
        disabled={state.isGameOver}
      />

      {/* Score Board */}
      <KniffelBoard
        players={state.players}
        activePlayerIndex={state.activePlayerIndex}
        possibleScores={possibleScores}
        rollCount={state.rollCount}
        onScoreCategory={handleScoreCategory}
        disabled={state.isGameOver}
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

      {/* Reset confirmation modal */}
      <ConfirmDialog
        open={resetDialogOpen}
        title={t('games.kniffel.new_game', 'Neues Spiel')}
        content={t('games.kniffel.new_game_confirm', 'Möchtest du wirklich eine neue Runde starten? Der aktuelle Spielstand geht verloren.')}
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
