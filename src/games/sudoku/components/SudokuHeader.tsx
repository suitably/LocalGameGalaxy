/**
 * SudokuHeader.tsx - Difficulty Selector, Timer and Game Status Bar
 */

import React from 'react';
import {
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

interface SudokuHeaderProps {
  difficulty: SudokuDifficulty;
  onChangeDifficulty: (diff: SudokuDifficulty) => void;
  mistakes: number;
  maxMistakes: number;
  timeElapsed: number;
  isPaused: boolean;
  onTogglePause: () => void;
  onBack: () => void;
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <IconButton onClick={onBack} edge="start">
          <ArrowBackRoundedIcon />
        </IconButton>

        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            letterSpacing: 2,
            background: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          SUDOKU
        </Typography>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title={t('sudoku.stats.title', 'Statistiken')}>
            <IconButton onClick={onOpenStats}>
              <BarChartRoundedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common.help', 'Hilfe')}>
            <IconButton onClick={onOpenHelp}>
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
          bgcolor: 'rgba(255, 255, 255, 0.04)',
          borderRadius: 2,
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#94a3b8' }}>
          {t('sudoku.mistakes', 'Fehler')}:{' '}
          <Box component="span" sx={{ color: mistakes > 0 ? '#ef4444' : '#ffffff', fontWeight: 800 }}>
            {mistakes}/{maxMistakes}
          </Box>
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '1.05rem' }}>
            ⏱️ {formatTime(timeElapsed)}
          </Typography>
          <IconButton size="small" onClick={onTogglePause}>
            {isPaused ? <PlayCircleOutlineRoundedIcon color="primary" /> : <PauseCircleOutlineRoundedIcon />}
          </IconButton>
        </Box>
      </Stack>
    </Box>
  );
};
