/**
 * Secret santa: pick your own name before drawing [ID: DRAWPOT-IDENTITY-PICKER]
 */
import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { useTranslation } from 'react-i18next';
import type { DrawPotPublicView } from '../logic/api';

interface IdentityPickerProps {
  entries: NonNullable<DrawPotPublicView['entries']>;
  selected: string | null;
  onSelect: (id: string) => void;
}

export const IdentityPicker: React.FC<IdentityPickerProps> = ({ entries, selected, onSelect }) => {
  const { t } = useTranslation();
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        {t('drawpot.participant.whoAreYou')}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }} role="radiogroup">
        {entries.map((e) => (
          <Chip
            key={e.id}
            role="radio"
            aria-checked={selected === e.id}
            label={e.label}
            disabled={e.taken}
            icon={selected === e.id ? <CheckRoundedIcon /> : undefined}
            color={selected === e.id ? 'primary' : 'default'}
            variant={selected === e.id ? 'filled' : 'outlined'}
            onClick={() => onSelect(e.id)}
            sx={{ minHeight: 40, fontSize: 15 }}
          />
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        {t('drawpot.participant.whoAreYouHint')}
      </Typography>
    </Box>
  );
};
