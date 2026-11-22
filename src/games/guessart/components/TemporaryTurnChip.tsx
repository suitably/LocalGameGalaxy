import React from 'react';
import { alpha, Chip, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import TransferWithinAStationRoundedIcon from '@mui/icons-material/TransferWithinAStationRounded';
import { useTranslation } from 'react-i18next';

/** Header badge: the host plays this one turn locally, then it reverts to the remote player. */
export const TemporaryTurnChip: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Tooltip title={t('guessart.temporaryTurnDesc')}>
      <Chip
        icon={<TransferWithinAStationRoundedIcon fontSize="small" />}
        label={isSmallScreen ? t('guessart.temporaryTurnShort') : t('guessart.temporaryTurnChip')}
        size="small"
        color="warning"
        variant="outlined"
        sx={{
          ml: 0.5,
          flexShrink: 0,
          fontWeight: 700,
          fontSize: '0.75rem',
          height: { xs: 24, sm: 26 },
          borderColor: 'warning.main',
          bgcolor: (th) => alpha(th.palette.warning.main, 0.08),
        }}
      />
    </Tooltip>
  );
};
