import React from 'react';
import { Box, Button, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import CasinoIcon from '@mui/icons-material/CasinoRounded';
import { useTranslation } from 'react-i18next';

interface QwixxPresetSwitcherProps {
  presetNames: string[];
  value: number;
  onChange: (presetIndex: number) => void;
}

/** Layout preset toggle (plus a "random layout" shortcut) shown on cards with several layouts. */
export const QwixxPresetSwitcher: React.FC<QwixxPresetSwitcherProps> = ({
  presetNames,
  value,
  onChange,
}) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ my: 0.75, width: '100%' }} onClick={(e) => e.stopPropagation()}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
          {t('games.qwixx.select_preset', 'Block-Layout:')}
        </Typography>
        <Button
          size="small"
          variant="text"
          color="secondary"
          startIcon={<CasinoIcon sx={{ fontSize: 13 }} />}
          onClick={(e) => {
            e.stopPropagation();
            onChange(Math.floor(Math.random() * (presetNames.length || 1)));
          }}
          sx={{
            fontSize: '0.75rem',
            py: 0,
            px: 0.5,
            minWidth: 'auto',
            textTransform: 'none',
            fontWeight: 'bold',
          }}
        >
          {t('games.qwixx.random_block_in_mode', 'Zufall')}
        </Button>
      </Box>
      <ToggleButtonGroup
        size="small"
        value={value}
        exclusive
        onChange={(_, val) => {
          if (val !== null) onChange(val);
        }}
        sx={{ height: 26, width: '100%' }}
      >
        {presetNames.map((name, idx) => (
          <ToggleButton
            key={idx}
            value={idx}
            sx={{
              flex: 1,
              px: 0.5,
              py: 0,
              fontSize: '0.75rem',
              textTransform: 'none',
              fontWeight: 'bold',
            }}
          >
            {name}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
};
