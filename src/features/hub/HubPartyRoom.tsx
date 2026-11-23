/**
 * The hub's first entry: open a party room the whole group joins [ID: COMP-HUB-PARTY-ROOM]
 *
 * The room is a place, not a game (ADR-0011): players join by the host's QR code or link,
 * then the host picks any game with a party mode.
 */
import React from 'react';
import { Box, Button, Card, Typography, useTheme } from '@mui/material';
import CelebrationIcon from '@mui/icons-material/CelebrationRounded';
import { useTranslation } from 'react-i18next';

export const HubPartyRoom: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const fill = theme.palette.piece.pink;
  return (
    <Card sx={{ mb: 3, p: { xs: 2, sm: 3 }, borderColor: fill }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flex: 1 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
              bgcolor: fill,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <CelebrationIcon sx={{ fontSize: 32, color: theme.palette.piece.contrastText }} />
          </Box>
          <Box>
            <Typography variant="h5" component="h2">
              {t('hub.party_room.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('hub.party_room.desc')}
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" size="large" onClick={onOpen} sx={{ minHeight: 48 }}>
          {t('hub.party_room.open')}
        </Button>
      </Box>
    </Card>
  );
};
