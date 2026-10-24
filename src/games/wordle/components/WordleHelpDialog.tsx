/**
 * WordleHelpDialog.tsx - How-to-play dialog with one sample tile per letter state.
 */

import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { LetterStatus } from '../logic/types';
import { tileStyle } from './tileStyles';

const SAMPLES: { status: LetterStatus; char: string; key: string }[] = [
  { status: 'correct', char: 'A', key: 'wordle.help.green' },
  { status: 'present', char: 'B', key: 'wordle.help.yellow' },
  { status: 'absent', char: 'C', key: 'wordle.help.gray' },
];

export const WordleHelpDialog: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>{t('wordle.help.title', 'Spielregeln')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="body2">{t('wordle.help.p1')}</Typography>
        <Typography variant="body2">{t('wordle.help.p2')}</Typography>
        <Stack spacing={1} sx={{ my: 1 }}>
          {SAMPLES.map(({ status, char, key }) => (
            <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  flexShrink: 0,
                  border: '2px solid',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  ...tileStyle(status),
                }}
              >
                {char}
              </Box>
              <Typography variant="body2">{t(key)}</Typography>
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close', 'Verstanden')}</Button>
      </DialogActions>
    </Dialog>
  );
};
