/**
 * Room code, player name and edit actions [ID: COMP-PARTY-ROOM-HEADER]
 */
import React from 'react';
import { Box, Button, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { PartyLobbyController } from '../hooks/usePartyLobbyController';

export const PartyRoomHeader: React.FC<{ lobby: PartyLobbyController }> = ({ lobby }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { roomId, setShowQr, setEditRoomOpen, setCustomRoomInput, amIHost, leaveParty } = lobby;
  return (
    <>
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={2.5}
        flexWrap="wrap"
        gap={1}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={() => navigate('/')} size="small">
            <ArrowBackRoundedIcon />
          </IconButton>
          <Typography variant="h5" fontWeight={900}>
            🎉 {t('party.lobbyTitle', 'Galaxy Party-Lobby')}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.8} flexWrap="wrap">
          <Chip
            label={`${t('party.room', 'Raum')}: ${roomId}`}
            color="primary"
            variant="filled"
            sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}
          />
          {amIHost && (
            <Tooltip title={t('party.editRoomCode', 'Eigenen Raum-Code festlegen')}>
              <IconButton
                size="small"
                onClick={() => {
                  setCustomRoomInput(roomId);
                  setEditRoomOpen(true);
                }}
              >
                <EditRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={t('party.shareLobbyTooltip', 'Lobby teilen / QR-Code anzeigen')}>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<ShareRoundedIcon />}
              onClick={() => setShowQr(true)}
              sx={{ fontWeight: 700, borderRadius: 2, height: 32 }}
            >
              {t('party.shareLobby', 'Lobby teilen')}
            </Button>
          </Tooltip>
          {!amIHost && (
            <Tooltip title={t('party.leave', 'Party verlassen')}>
              <IconButton size="small" color="error" onClick={leaveParty}>
                <LogoutRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </>
  );
};
