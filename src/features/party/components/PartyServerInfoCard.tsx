/**
 * Companion server connection info (host only) [ID: COMP-PARTY-SERVER-INFO-CARD]
 */
import React from 'react';
import { Box, Button, Card, Typography } from '@mui/material';
import DnsRoundedIcon from '@mui/icons-material/DnsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { PartyLobbyController } from '../hooks/usePartyLobbyController';

export const PartyServerInfoCard: React.FC<{ lobby: PartyLobbyController }> = ({ lobby }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { serverUrl, isServerActive, amIHost } = lobby;
  return (
    <>
      {/* Backend / Server URL Connection Info Card (Host Only) */}
      {amIHost && (
        <Card
          variant="outlined"
          sx={{
            px: 2,
            py: 1.2,
            mb: 2,
            borderRadius: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'action.selected',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box display="flex" alignItems="center" gap={1} minWidth={0} mr={1}>
            <DnsRoundedIcon
              fontSize="small"
              color={isServerActive && serverUrl ? 'success' : 'action'}
            />
            <Box minWidth={0}>
              <Typography variant="caption" color="text.secondary" display="block">
                {t('party.backendUrlLabel', 'Host Backend-Verbindung:')}
              </Typography>
              <Typography variant="body2" fontWeight={700} noWrap>
                {isServerActive && serverUrl
                  ? serverUrl
                  : t('party.defaultCloudRelay', 'Öffentliches Cloud Relay (Standard)')}
              </Typography>
            </Box>
          </Box>
          <Button
            size="small"
            variant="text"
            startIcon={<SettingsRoundedIcon />}
            onClick={() => navigate('/settings')}
            sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            {t('party.manageBackend', 'Server verwalten')}
          </Button>
        </Card>
      )}
    </>
  );
};
