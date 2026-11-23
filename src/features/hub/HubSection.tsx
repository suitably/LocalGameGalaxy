/**
 * One group of hub tiles with an optional heading [ID: COMP-HUB-SECTION]
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { areaById } from '../../lib/areas';
import type { CatalogEntry } from '../../lib/catalog/types';
import { HubGameCard } from './HubGameCard';

export const HubSection: React.FC<{
  title?: string;
  entries: (CatalogEntry & { icon?: React.ReactNode })[];
  onOpen: (entry: CatalogEntry) => void;
}> = ({ title, entries, onOpen }) =>
  entries.length === 0 ? null : (
    <Box component="section" sx={{ mb: { xs: 3, sm: 4 } }}>
      {title && (
        <Typography variant="h6" component="h2" fontWeight={800} sx={{ mb: 1.5 }}>
          {title}
        </Typography>
      )}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: { xs: 2, sm: 3 },
        }}
      >
        {entries.map((entry) => (
          <HubGameCard
            key={entry.id}
            game={entry}
            area={areaById(entry.area)}
            onOpen={() => onOpen(entry)}
          />
        ))}
      </Box>
    </Box>
  );
