/**
 * Room code, player name and edit actions [ID: COMP-PARTY-ROOM-HEADER]
 */
import React from 'react';
import { Box, Button, Chip, IconButton, Tooltip } from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../../context/TitleContext';
import type { PartyLobbyController } from '../hooks/usePartyLobbyController';

export const PartyRoomHeader: React.FC<{ lobby: PartyLobbyController }> = ({ lobby }) => {
  const { t } = useTranslation();
  // The page title lives in the global header, not in the content (DESIGN.md §6).
  usePageTitle(t('party.lobbyTitle', 'Party-Lobby'));
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
