/**
 * SudokuHeader.tsx - Difficulty Selector, Timer and Game Status Bar
 */

import React from 'react';
import {
  alpha,
  Box,
  Typography,
  IconButton,
  Button,
  ButtonGroup,
  Stack,
  Tooltip,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PauseCircleOutlineRoundedIcon from '@mui/icons-material/PauseCircleOutlineRounded';
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import { useTranslation } from 'react-i18next';
import type { SudokuDifficulty } from '../logic/types';
import { scoreText } from '../../../themeTokens';

interface SudokuHeaderProps {
  difficulty: SudokuDifficulty;
  onChangeDifficulty: (diff: SudokuDifficulty) => void;
  mistakes: number;
  maxMistakes: number;
  timeElapsed: number;
  isPaused: boolean;
  onTogglePause: () => void;
  onBack?: () => void;
  onOpenHelp: () => void;
  onOpenStats: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const SudokuHeader: React.FC<SudokuHeaderProps> = ({
  difficulty,
  onChangeDifficulty,
  mistakes,
  maxMistakes,
  timeElapsed,
  isPaused,
  onTogglePause,
  onBack,
  onOpenHelp,
  onOpenStats,
}) => {
  const { t } = useTranslation();

  const difficulties: { key: SudokuDifficulty; labelKey: string }[] = [
    { key: 'easy', labelKey: 'sudoku.difficulty.easy' },
    { key: 'medium', labelKey: 'sudoku.difficulty.medium' },
    { key: 'hard', labelKey: 'sudoku.difficulty.hard' },
    { key: 'expert', labelKey: 'sudoku.difficulty.expert' },
  ];

  return (
    <Box sx={{ width: '100%', maxWidth: { xs: 360, sm: 440, md: 480 }, mx: 'auto', mb: 1.5 }}>
      {/* Navigation & Title Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: onBack ? 'space-between' : 'flex-end',
          mb: 1,
        }}
      >
        {onBack && (
          <IconButton onClick={onBack} edge="start" aria-label={t('common.back', 'Zurück')}>
            <ArrowBackRoundedIcon />
          </IconButton>
        )}

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title={t('sudoku.stats.title', 'Statistiken')}>
            <IconButton onClick={onOpenStats} aria-label={t('sudoku.stats.title', 'Statistiken')}>
              <BarChartRoundedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common.help', 'Hilfe')}>
            <IconButton onClick={onOpenHelp} aria-label={t('common.help', 'Hilfe')}>
              <HelpOutlineRoundedIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Difficulty Selector */}
      <ButtonGroup size="small" variant="outlined" fullWidth sx={{ mb: 1.5 }}>
        {difficulties.map((d) => (
          <Button
            key={d.key}
            variant={difficulty === d.key ? 'contained' : 'outlined'}
            color="primary"
            onClick={() => onChangeDifficulty(d.key)}
            sx={{ fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.85rem' } }}
          >
            {t(d.labelKey)}
          </Button>
        ))}
      </ButtonGroup>

      {/* Live Status Bar */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{
          px: 1.5,
          py: 0.8,
          bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
          borderRadius: 2,
          border: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          {t('sudoku.mistakes', 'Fehler')}:{' '}
          <Box
            component="span"
            sx={{ color: mistakes > 0 ? 'error.main' : 'text.primary', fontWeight: 800 }}
          >
            {mistakes}/{maxMistakes}
          </Box>
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" sx={{ ...scoreText, fontWeight: 800, fontSize: '1.05rem' }}>
            {formatTime(timeElapsed)}
          </Typography>
          <IconButton
            size="small"
            onClick={onTogglePause}
            aria-label={isPaused ? t('common.a11y.play', 'Play') : t('common.a11y.pause', 'Pause')}
          >
            {isPaused ? (
              <PlayCircleOutlineRoundedIcon color="primary" />
            ) : (
              <PauseCircleOutlineRoundedIcon />
            )}
          </IconButton>
        </Box>
      </Stack>
    </Box>
  );
};
