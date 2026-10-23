/**
 * Shown when the host took this device out of the room [ID: COMP-PARTY-REMOVED-NOTICE]
 */
import React from 'react';
import { Alert, Box, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { PartyLobbyController } from '../hooks/usePartyLobbyController';

export const PartyRemovedNotice: React.FC<{ lobby: PartyLobbyController }> = ({ lobby }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Alert severity="info" sx={{ borderRadius: 2 }}>
      {t('party.removedByHost', 'Der Host hat dich aus der Party entfernt.')}
      <Box display="flex" gap={1} mt={1.5} flexWrap="wrap">
        <Button variant="contained" size="small" onClick={lobby.rejoin}>
          {t('party.rejoin', 'Wieder beitreten')}
        </Button>
        <Button size="small" onClick={() => navigate('/')}>
          {t('party.backToHub', 'Zur Übersicht')}
        </Button>
      </Box>
    </Alert>
  );
};
