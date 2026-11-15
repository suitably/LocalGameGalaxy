/**
 * What is in the pot, when the host allows participants to see it [ID: DRAWPOT-ENTRIES-OVERVIEW]
 */
import React from 'react';
import { Box, Card, Chip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { DrawPotEntry } from '../logic/api';

interface PotEntriesOverviewProps {
  pot: {
    settings: { mode: string; showEntries: boolean };
    entries: (DrawPotEntry & { taken: boolean })[] | null;
  };
  /** Host view: always show, with every entry. */
  title?: string;
}

export const PotEntriesOverview: React.FC<PotEntriesOverviewProps> = ({ pot, title }) => {
  const { t } = useTranslation();
  if (
    !pot.entries ||
    (!title && (pot.settings.mode === 'secret-santa' || !pot.settings.showEntries))
  )
    return null;
  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        {title ?? t('drawpot.participant.inThePot')}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {pot.entries.map((e) => (
          <Chip
            key={e.id}
            size="small"
            label={e.label}
            variant="outlined"
            sx={e.taken ? { textDecoration: 'line-through', opacity: 0.5 } : undefined}
          />
        ))}
      </Box>
    </Card>
  );
};
