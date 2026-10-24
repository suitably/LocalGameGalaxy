import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ButtonBase,
  Box,
  Typography,
  IconButton,
  alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/CloseRounded';
import { useTranslation } from 'react-i18next';

interface TargetCell {
  row: number;
  col: number;
}

interface KnisterNumberPickerModalProps {
  open: boolean;
  targetCell: TargetCell | null;
  onSelectNumber: (num: number, row: number, col: number) => void;
  onClose: () => void;
}

const PICKER_NUMBERS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const KnisterNumberPickerModal: React.FC<KnisterNumberPickerModalProps> = ({
  open,
  targetCell,
  onSelectNumber,
  onClose,
}) => {
  const { t } = useTranslation();

  if (!targetCell) return null;

  const handlePick = (num: number) => {
    onSelectNumber(num, targetCell.row, targetCell.col);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          p: 1.5,
          userSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          fontWeight: 800,
          fontSize: { xs: '1.1rem', sm: '1.25rem' },
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={800} color="warning.light">
            {t('games.knister.pick_number_title', 'Zahl eintragen')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('games.knister.cell_coordinates', {
              defaultValue: `Zeile ${targetCell.row + 1}, Spalte ${targetCell.col + 1}`,
              row: targetCell.row + 1,
              col: targetCell.col + 1,
            })}
          </Typography>
        </Box>

        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 1, pt: 1.5 }}>
        {/* Numpad Layout 3 columns */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1.2,
            maxWidth: 320,
            mx: 'auto',
          }}
        >
          {PICKER_NUMBERS.map((num) => {
            const isSeven = num === 7;
            return (
              <ButtonBase
                key={`picker-num-${num}`}
                onClick={() => handlePick(num)}
                sx={{
                  height: { xs: 54, sm: 60 },
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: { xs: '1.4rem', sm: '1.6rem' },
                  bgcolor: (theme) =>
                    isSeven
                      ? alpha(theme.palette.warning.main, 0.2)
                      : theme.palette.background.default,
                  color: isSeven ? 'warning.main' : 'text.primary',
                  border: '1.5px solid',
                  borderColor: isSeven ? 'warning.main' : 'divider',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: 'warning.main',
                    color: 'warning.contrastText',
                    transform: 'scale(1.05)',
                    borderColor: 'warning.light',
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                  },
                }}
              >
                {num}
              </ButtonBase>
            );
          })}

          {/* Quick cancel slot in 12th position */}
          <ButtonBase
            onClick={onClose}
            sx={{
              height: { xs: 54, sm: 60 },
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: { xs: '0.9rem', sm: '1rem' },
              bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
              color: 'text.secondary',
              border: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.1),
                color: 'text.primary',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
            }}
          >
            {t('common.cancel', 'Abbrechen')}
          </ButtonBase>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 1, pb: 0.5, justifyContent: 'center' }}>
        <Typography variant="caption" color="text.secondary" textAlign="center">
          {t('games.knister.tap_number_hint', 'Tippe auf eine Zahl, um sie sofort zu platzieren')}
        </Typography>
      </DialogActions>
    </Dialog>
  );
};
