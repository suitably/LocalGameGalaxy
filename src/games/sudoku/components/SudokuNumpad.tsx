/**
 * SudokuNumpad.tsx - Touch Number Pad and Action Toolbar
 */

import React, { useEffect } from 'react';
import { Box, Button, IconButton, Stack, Typography, Tooltip } from '@mui/material';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import { useTranslation } from 'react-i18next';

interface SudokuNumpadProps {
  onNumber: (num: number) => void;
  onErase: () => void;
  onUndo: () => void;
  onHint: () => void;
  isPencilMode: boolean;
  onTogglePencil: () => void;
  remainingCounts: Record<number, number>;
  disabled?: boolean;
}

export const SudokuNumpad: React.FC<SudokuNumpadProps> = ({
  onNumber,
  onErase,
  onUndo,
  onHint,
  isPencilMode,
  onTogglePencil,
  remainingCounts,
  disabled = false,
}) => {
  const { t } = useTranslation();

  // Physical keyboard support
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        e.preventDefault();
        onNumber(num);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        onErase();
      } else if (e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        onTogglePencil();
      } else if (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onUndo();
      } else if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        onHint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNumber, onErase, onTogglePencil, onUndo, onHint, disabled]);

  return (
    <Box sx={{ width: '100%', maxWidth: { xs: 360, sm: 440, md: 480 }, mx: 'auto', mt: 2 }}>
      {/* Action Toolbar */}
      <Stack direction="row" justifyContent="space-around" sx={{ mb: 1.5 }}>
        <Tooltip title={t('sudoku.actions.undo', 'Rückgängig (Ctrl+Z)')}>
          <IconButton onClick={onUndo} disabled={disabled} sx={{ bgcolor: 'rgba(255, 255, 255, 0.08)' }}>
            <UndoRoundedIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={t('sudoku.actions.erase', 'Löschen (Entf)')}>
          <IconButton onClick={onErase} disabled={disabled} sx={{ bgcolor: 'rgba(255, 255, 255, 0.08)' }}>
            <BackspaceOutlinedIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={t('sudoku.actions.notes', 'Notizen / Bleistift (N)')}>
          <Button
            variant={isPencilMode ? 'contained' : 'outlined'}
            color={isPencilMode ? 'primary' : 'inherit'}
            startIcon={<EditRoundedIcon />}
            onClick={onTogglePencil}
            disabled={disabled}
            size="small"
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            {isPencilMode ? t('sudoku.notes_on', 'Notizen AN') : t('sudoku.notes_off', 'Notizen')}
          </Button>
        </Tooltip>

        <Tooltip title={t('sudoku.actions.hint', 'Hinweis (H)')}>
          <IconButton onClick={onHint} disabled={disabled} sx={{ bgcolor: 'rgba(255, 255, 255, 0.08)' }}>
            <LightbulbOutlinedIcon color="warning" />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* 1-9 Number Row / Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(9, 1fr)',
          gap: { xs: 0.5, sm: 1 },
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
          const remaining = remainingCounts[num] ?? 0;
          const isDone = remaining === 0;

          return (
            <Button
              key={num}
              disabled={disabled || isDone}
              onClick={() => onNumber(num)}
              variant="contained"
              sx={{
                minWidth: 0,
                height: { xs: 46, sm: 54 },
                p: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                bgcolor: isDone ? 'rgba(255, 255, 255, 0.04)' : '#1e293b',
                color: isDone ? '#64748b' : '#60a5fa',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 1.5,
                '&:hover': {
                  bgcolor: '#2563eb',
                  color: '#ffffff',
                },
              }}
            >
              <Typography sx={{ fontSize: { xs: '1.2rem', sm: '1.4rem' }, fontWeight: 800, lineHeight: 1 }}>
                {num}
              </Typography>
              <Typography sx={{ fontSize: '0.65rem', color: isDone ? '#475569' : '#94a3b8', lineHeight: 1, mt: 0.3 }}>
                {remaining}
              </Typography>
            </Button>
          );
        })}
      </Box>
    </Box>
  );
};
