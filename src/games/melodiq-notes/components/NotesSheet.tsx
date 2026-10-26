/**
 * Side panel for Melodiq Notes: bottom sheet on phones, right-hand drawer on larger screens, so
 * the stage stays in view while settings change [ID: COMP-NOTES-SHEET]
 */
import React from 'react';
import {
  Box,
  Drawer,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  type Theme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/CloseRounded';
import { useTranslation } from 'react-i18next';

interface NotesSheetProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}

export const NotesSheet: React.FC<NotesSheetProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
}) => {
  const { t } = useTranslation();
  const phone = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  return (
    <Drawer
      anchor={phone ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      // the stage stays visible: no dimmed backdrop
      slotProps={{
        backdrop: { invisible: true },
        paper: {
          sx: phone
            ? {
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                maxHeight: '75dvh',
                pb: 'env(safe-area-inset-bottom)',
              }
            : { width: 440, maxWidth: '100vw' },
        },
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ p: 2, pb: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" fontWeight={800}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" noWrap>
              {subtitle}
            </Typography>
          )}
        </Box>
        <IconButton aria-label={t('common.close')} onClick={onClose} edge="end">
          <CloseIcon />
        </IconButton>
      </Stack>
      <Box sx={{ px: 2, pb: 2, overflowY: 'auto' }}>{children}</Box>
    </Drawer>
  );
};
