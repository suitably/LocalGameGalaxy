import React from 'react';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface PhoneTrackPickerProps {
  trackNames: string[];
  value: number;
  onChange: (trackIndex: number) => void;
}

/** Lets a phone singer pick the duet part (P1 / P2) they sing. */
export const PhoneTrackPicker: React.FC<PhoneTrackPickerProps> = ({
  trackNames,
  value,
  onChange,
}) => {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 72,
        right: 12,
        zIndex: 30,
        pointerEvents: 'auto',
        bgcolor: 'rgba(0,0,0,0.6)',
        borderRadius: 2,
      }}
    >
      <ToggleButtonGroup
        exclusive
        size="small"
        value={value}
        onChange={(_, next: number | null) => {
          if (next !== null) onChange(next);
        }}
        aria-label={t('melodiq.duet_part')}
      >
        {trackNames.map((name, index) => (
          <ToggleButton key={index} value={index} sx={{ px: 1.5, color: 'text.primary' }}>
            {`P${index + 1}`}
            {name && !/^player \d+$/i.test(name) ? ` · ${name}` : ''}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
};
