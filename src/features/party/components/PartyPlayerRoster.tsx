/**
 * Players in the room [ID: COMP-PARTY-PLAYER-ROSTER]
 */
import React from 'react';
import {
  alpha,
  Box,
  Chip,
  FormControlLabel,
  Switch,
  Tooltip,
  Typography,
  Avatar,
} from '@mui/material';
import { EmptyState } from '../../../components/common/EmptyState';
import StarsRoundedIcon from '@mui/icons-material/StarsRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import PersonRemoveRoundedIcon from '@mui/icons-material/PersonRemoveRounded';
import { useTranslation } from 'react-i18next';
import { universalPartyManager } from '../logic/universalPartyManager';
import type { PartyLobbyController } from '../hooks/usePartyLobbyController';
import { transitionOf } from '../../../lib/motion';

export const PartyPlayerRoster: React.FC<{ lobby: PartyLobbyController }> = ({ lobby }) => {
  const { t } = useTranslation();
  const { setEditNameOpen, setEditNameInput, players, amIHost, removePlayer, setWatching } = lobby;
  const me = players.find((p) => p.id === universalPartyManager.getMyPlayerId());
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
                  <Avatar
                    sx={{ bgcolor: p.avatarColor, fontWeight: 'bold', color: 'text.primary' }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </Avatar>
                }
                label={
                  <Box component="span" display="inline-flex" alignItems="center" gap={0.6}>
                    <Typography variant="body2" fontWeight={isMe ? 800 : 600} component="span">
                      {p.name} {isMe ? `(${t('common.you', 'Du')})` : ''}
                    </Typography>
                    {p.isHost && <StarsRoundedIcon sx={{ color: 'warning.main', fontSize: 18 }} />}
                    {p.spectator && (
                      <Tooltip title={t('party.spectatorBadge', 'Zuschauer')}>
                        <VisibilityRoundedIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                      </Tooltip>
                    )}
                  </Box>
                }
                onDelete={
                  isMe
                    ? () => {
                        setEditNameInput(p.name);
                        setEditNameOpen(true);
                      }
                    : amIHost
                      ? () => removePlayer(p.id)
                      : undefined
                }
                deleteIcon={
                  isMe ? (
                    <Tooltip title={t('party.editNameTooltip', 'Namen ändern')}>
                      <EditRoundedIcon fontSize="small" sx={{ color: 'primary.main' }} />
                    </Tooltip>
                  ) : amIHost ? (
                    <Tooltip title={t('party.removePlayer', 'Aus der Party entfernen')}>
                      <PersonRemoveRoundedIcon fontSize="small" />
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
                  bgcolor: (theme) =>
                    isMe
                      ? alpha(theme.palette.primary.main, 0.1)
                      : theme.palette.background.default,
                  boxShadow: 'none',
                  cursor: isMe ? 'pointer' : 'default',
                  transition: transitionOf(['background-color', 'border-color', 'box-shadow']),
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
            <EmptyState dense message={t('party.waitingForGuests', 'Warte auf Mitspieler...')} />
          )}
        </Box>

        {me && !amIHost && (
          <FormControlLabel
            sx={{ mt: 1.5 }}
            control={
              <Switch
                checked={Boolean(me.spectator)}
                onChange={(e) => setWatching(e.target.checked)}
              />
            }
            label={
              <Typography variant="body2">
                {t('party.watchOnly', 'Zuschauen')}
                <Typography variant="caption" color="text.secondary" component="span" ml={1}>
                  {t('party.watchOnlyHint', 'Tischspiele ohne Sitz, nur ansehen')}
                </Typography>
              </Typography>
            }
          />
        )}
      </Box>
    </>
  );
};
