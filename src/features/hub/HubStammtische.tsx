/**
 * Saved Stammtisch rooms on the hub, and opening one on app start [ID: COMP-HUB-STAMMTISCH]
 *
 * Each saved room is one tap back into its lobby (`useOpenStammtisch`). A device with
 * "open on start" goes straight into that room once per app session.
 */
import React, { useEffect, useState } from 'react';
import { Box, Button, Card, Typography } from '@mui/material';
import TableBarRoundedIcon from '@mui/icons-material/TableBarRounded';
import { useTranslation } from 'react-i18next';
import { loadStammtische, takeAutoOpenStammtisch } from '../party/logic/stammtisch';
import { useOpenStammtisch } from '../party/hooks/useOpenStammtisch';

export const HubStammtische: React.FC = () => {
  const { t } = useTranslation();
  const [rooms] = useState(loadStammtische);
  const open = useOpenStammtisch();

  useEffect(() => {
    const auto = takeAutoOpenStammtisch(rooms);
    if (auto) open(auto);
  }, [rooms, open]);

  if (rooms.length === 0) return null;
  return (
    <Box display="grid" gap={1.5} mb={3}>
      {rooms.map((room) => (
        <Card
          key={room.roomId}
          variant="outlined"
          sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2 }}
        >
          <TableBarRoundedIcon color="primary" sx={{ fontSize: 32 }} />
          <Box flex={1} minWidth={0}>
            <Typography variant="h6" component="h2" noWrap>
              {room.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('hub.stammtisch.desc')}
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            sx={{ minHeight: 48 }}
            onClick={() => open(room)}
          >
            {t('hub.stammtisch.open')}
          </Button>
        </Card>
      ))}
    </Box>
  );
};
