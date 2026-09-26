import React from 'react';
import { Box, Tooltip, IconButton } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import { useTranslation } from 'react-i18next';

export const HeaderActionBar: React.FC<{
  onHistory: () => void;
  onDuel: () => void;
  onStats: () => void;
  onHelp: () => void;
}> = ({ onHistory, onDuel, onStats, onHelp }) => {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        pb: 1.5,
        mb: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title={t('wordle.history.btn_tooltip', 'Verlauf')}>
          <IconButton onClick={onHistory} aria-label={t('wordle.history.btn_tooltip', 'Verlauf')}>
            <HistoryIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('wordle.duel.btn_tooltip', 'Freund herausfordern')}>
          <IconButton onClick={onDuel} aria-label={t('wordle.duel.btn_tooltip', 'Freund herausfordern')}>
            <PersonAddAlt1RoundedIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('wordle.stats.btn_tooltip', 'Statistiken')}>
          <IconButton onClick={onStats} aria-label={t('wordle.stats.btn_tooltip', 'Statistiken')}>
            <BarChartRoundedIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('common.help', 'Hilfe')}>
          <IconButton onClick={onHelp} aria-label={t('common.help', 'Hilfe')}>
            <HelpOutlineRoundedIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};
