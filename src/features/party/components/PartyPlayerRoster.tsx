/**
 * Players in the room [ID: COMP-PARTY-PLAYER-ROSTER]
 */
import React from 'react';
import { Box, Chip, Tooltip, Typography, Avatar, CircularProgress } from '@mui/material';
import StarsRoundedIcon from '@mui/icons-material/StarsRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { useTranslation } from 'react-i18next';
import { universalPartyManager } from '../logic/universalPartyManager';
import type { PartyLobbyController } from '../hooks/usePartyLobbyController';

export const PartyPlayerRoster: React.FC<{ lobby: PartyLobbyController }> = ({ lobby }) => {
  const { t } = useTranslation();
  const { setEditNameOpen, setEditNameInput, players } = lobby;
  return (
    <>
      {/* Connected Players Roster */}
      <Box mb={3.5}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
            {t('party.connectedPlayers', 'Verbundene Spieler')} ({players.length})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('party.stayConnectedHint', 'Alle Handys bleiben für jedes Spiel verbunden')}
          </Typography>
        </Box>

        <Box display="flex" flexWrap="wrap" gap={1.5}>
          {players.map((p) => {
            const isMe = p.id === universalPartyManager.getMyPlayerId();
            return (
              <Chip
                key={p.id}
                avatar={
                  <Avatar sx={{ bgcolor: p.avatarColor, fontWeight: 'bold', color: '#fff' }}>
                    {p.name.charAt(0).toUpperCase()}
                  </Avatar>
                }
                label={
                  <Box component="span" display="inline-flex" alignItems="center" gap={0.6}>
                    <Typography variant="body2" fontWeight={isMe ? 800 : 600} component="span">
                      {p.name} {isMe ? `(${t('common.you', 'Du')})` : ''}
                    </Typography>
                    {p.isHost && <StarsRoundedIcon sx={{ color: 'warning.main', fontSize: 18 }} />}
                  </Box>
                }
                onDelete={
                  isMe
                    ? () => {
                        setEditNameInput(p.name);
                        setEditNameOpen(true);
                      }
                    : undefined
                }
                deleteIcon={
                  isMe ? (
                    <Tooltip title={t('party.editNameTooltip', 'Namen ändern')}>
                      <EditRoundedIcon fontSize="small" sx={{ color: 'primary.main' }} />
                    </Tooltip>
                  ) : undefined
                }
                onClick={
                  isMe
                    ? () => {
                        setEditNameInput(p.name);
                        setEditNameOpen(true);
                      }
                    : undefined
                }
                variant="outlined"
                sx={{
                  p: 2,
                  py: 2.5,
                  borderRadius: 3,
                  borderColor: isMe ? 'primary.main' : p.isHost ? 'secondary.main' : 'divider',
                  borderWidth: isMe ? 2 : 1,
                  bgcolor: isMe ? 'primary.main' + '18' : 'background.default',
                  boxShadow: isMe ? '0 2px 10px rgba(25, 118, 210, 0.2)' : 'none',
                  cursor: isMe ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  '&:hover': isMe
                    ? {
                        bgcolor: 'primary.main' + '28',
                      }
                    : {},
                }}
              />
            );
          })}

          {players.length === 0 && (
            <Box display="flex" alignItems="center" gap={1} py={1}>
              <CircularProgress size={18} />
              <Typography color="text.secondary" variant="body2">
                {t('party.waitingForGuests', 'Warte auf Mitspieler...')}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
};
