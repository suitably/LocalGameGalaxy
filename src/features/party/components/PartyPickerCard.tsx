/**
 * One game in the party picker [ID: COMP-PARTY-PICKER-CARD]
 */
import React from 'react';
import { Box, Card, CardActionArea, Chip, Typography } from '@mui/material';

export const PartyPickerCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  desc: string;
  chip?: string;
  onClick: () => void;
}> = ({ icon, title, desc, chip, onClick }) => (
  <Card variant="outlined" sx={{ borderRadius: 3, '&:hover': { borderColor: 'primary.main' } }}>
    <CardActionArea onClick={onClick} sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
      <Box sx={{ fontSize: 32, lineHeight: 1, display: 'flex' }}>{icon}</Box>
      <Box flex={1} minWidth={0}>
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {desc}
        </Typography>
      </Box>
      {chip && <Chip label={chip} size="small" color="success" variant="outlined" />}
    </CardActionArea>
  </Card>
);
