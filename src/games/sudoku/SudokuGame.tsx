/**
 * SudokuGame.tsx - Main Sudoku Game View & Screen Coordinator
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/TitleContext';
import { useSudoku } from './hooks/useSudoku';
import { SudokuHeader } from './components/SudokuHeader';
import { SudokuGrid } from './components/SudokuGrid';
import { SudokuNumpad } from './components/SudokuNumpad';
import { SudokuVictoryModal } from './components/SudokuVictoryModal';
import type { SudokuDifficulty } from './logic/types';

export const SudokuGame: React.FC = () => {
  const { t } = useTranslation();
  usePageTitle(t('games.sudoku.title', 'Sudoku'));

  const [helpOpen, setHelpOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  const {
    state,
    stats,
    remainingCounts,
    startNewGame,
    selectCell,
    inputNumber,
    eraseCell,
    undo,
    useHint,
    togglePencilMode,
    togglePause,
  } = useSudoku('medium');

  const handleChangeDifficulty = (diff: SudokuDifficulty) => {
    startNewGame(diff);
  };

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 600,
        mx: 'auto',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        px: { xs: 1.5, sm: 2 },
        py: { xs: 1.5, sm: 2.5 },
      }}
    >
      {/* Header & Status */}
      <SudokuHeader
        difficulty={state.difficulty}
        onChangeDifficulty={handleChangeDifficulty}
        mistakes={state.mistakes}
        maxMistakes={state.maxMistakes}
        timeElapsed={state.timeElapsed}
        isPaused={state.isPaused}
        onTogglePause={togglePause}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenStats={() => setStatsOpen(true)}
      />

      {/* 9x9 Grid */}
      <SudokuGrid
        grid={state.grid}
        selectedCell={state.selectedCell}
        onSelectCell={selectCell}
        isPaused={state.isPaused}
      />

      {/* Touch Number Pad & Toolbar */}
      <SudokuNumpad
        onNumber={inputNumber}
        onErase={eraseCell}
        onUndo={undo}
        onHint={useHint}
        isPencilMode={state.isPencilMode}
        onTogglePencil={togglePencilMode}
        remainingCounts={remainingCounts}
        disabled={state.isPaused || state.isCompleted || state.isGameOver}
      />

      {/* Victory / Game Over Modal */}
      <SudokuVictoryModal
        open={state.isCompleted || state.isGameOver}
        onClose={() => {}}
        isWon={state.isCompleted}
        difficulty={state.difficulty}
        timeElapsed={state.timeElapsed}
        bestTime={stats.bestTime[state.difficulty]}
        mistakes={state.mistakes}
        hintsUsed={state.hintsUsed}
        onNewGame={() => startNewGame(state.difficulty)}
      />

      {/* Stats Modal */}
      <Dialog open={statsOpen} onClose={() => setStatsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{t('sudoku.stats.title', 'Sudoku Statistiken 📊')}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ my: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">{t('sudoku.stats.played', 'Gespielt')}:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>{stats.played}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">{t('sudoku.stats.completed', 'Gelöst')}:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#4ade80' }}>{stats.completed}</Typography>
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2 }}>
              {t('sudoku.stats.best_times', 'Bestzeiten')}
            </Typography>
            {(['easy', 'medium', 'hard', 'expert'] as const).map((diff) => (
              <Box key={diff} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">{t(`sudoku.difficulty.${diff}`)}:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                  {stats.bestTime[diff] !== null
                    ? `${Math.floor(stats.bestTime[diff]! / 60)}m ${stats.bestTime[diff]! % 60}s`
                    : '-'}
                </Typography>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatsOpen(false)}>{t('common.close', 'Schließen')}</Button>
        </DialogActions>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>{t('sudoku.help.title', 'Sudoku Regeln 📖')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="body2">
            {t('sudoku.help.p1', 'Jede Zeile, Spalte und jeder 3x3-Block muss die Zahlen von 1 bis 9 genau einmal enthalten.')}
          </Typography>
          <Typography variant="body2">
            {t('sudoku.help.p2', 'Nutze den Bleistift-Modus (Notizen), um mögliche Zahlenkandidaten in einer Zelle vorzumerken.')}
          </Typography>
          <Typography variant="body2">
            {t('sudoku.help.p3', 'Bei 3 Fehlern ist die Runde verloren. Du kannst jederzeit Hinweise oder die Rückgängig-Funktion nutzen.')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpOpen(false)}>{t('common.close', 'Verstanden')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
