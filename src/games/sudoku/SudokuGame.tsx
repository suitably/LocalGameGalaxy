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
import { GameLayout } from '../../components/Layout/GameLayout';
import { useSudoku } from './hooks/useSudoku';
import { SudokuHeader } from './components/SudokuHeader';
import { SudokuGrid } from './components/SudokuGrid';
import { SudokuNumpad } from './components/SudokuNumpad';
import { SudokuVictoryModal } from './components/SudokuVictoryModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useSudokuHeaderActions } from './hooks/useSudokuHeaderActions';
import { hasSudokuProgress } from './logic/progress';
import type { SudokuDifficulty } from './logic/types';

export const SudokuGame: React.FC = () => {
  const { t } = useTranslation();
  usePageTitle(t('games.sudoku.title'));

  const [helpOpen, setHelpOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [pendingDifficulty, setPendingDifficulty] = useState<SudokuDifficulty | null>(null);
  useSudokuHeaderActions({
    onOpenStats: () => setStatsOpen(true),
    onOpenHelp: () => setHelpOpen(true),
  });

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

  // Switching difficulty starts a new board; ask first when that would discard progress.
  const handleChangeDifficulty = (diff: SudokuDifficulty) => {
    if (hasSudokuProgress(state)) setPendingDifficulty(diff);
    else startNewGame(diff);
  };

  return (
    <GameLayout maxWidth="sm" disablePadding>
      <Box
        sx={{
          width: '100%',
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
        />

        <ConfirmDialog
          open={pendingDifficulty !== null}
          title={t('sudoku.confirm_new.title')}
          message={t('sudoku.confirm_new.message', {
            difficulty: pendingDifficulty ? t(`sudoku.difficulty.${pendingDifficulty}`) : '',
          })}
          confirmText={t('sudoku.confirm_new.confirm')}
          confirmColor="error"
          onConfirm={() => {
            if (pendingDifficulty) startNewGame(pendingDifficulty);
            setPendingDifficulty(null);
          }}
          onCancel={() => setPendingDifficulty(null)}
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
          <DialogTitle sx={{ fontWeight: 800 }}>{t('sudoku.stats.title')}</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ my: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">{t('sudoku.stats.played')}:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {stats.played}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">{t('sudoku.stats.completed')}:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: 'success.main' }}>
                  {stats.completed}
                </Typography>
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2 }}>
                {t('sudoku.stats.best_times')}
              </Typography>
              {(['easy', 'medium', 'hard', 'expert'] as const).map((diff) => (
                <Box key={diff} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    {t(`sudoku.difficulty.${diff}`)}:
                  </Typography>
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
            <Button onClick={() => setStatsOpen(false)}>{t('common.close')}</Button>
          </DialogActions>
        </Dialog>

        {/* Help Dialog */}
        <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="xs">
          <DialogTitle sx={{ fontWeight: 800 }}>{t('sudoku.help.title')}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="body2">{t('sudoku.help.p1')}</Typography>
            <Typography variant="body2">{t('sudoku.help.p2')}</Typography>
            <Typography variant="body2">{t('sudoku.help.p3')}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setHelpOpen(false)}>{t('common.close')}</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </GameLayout>
  );
};
