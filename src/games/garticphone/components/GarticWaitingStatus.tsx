import React from 'react';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';
import { useTranslation } from 'react-i18next';
import { isPlayerFinishedCurrentRound } from '../garticEngine';
import type { GarticGameState } from '../types';

interface GarticWaitingStatusProps {
  state: GarticGameState;
  myPlayerId: string;
}

const AVATAR_COLORS = ['#e91e63', '#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4', '#795548'];

export const GarticWaitingStatus: React.FC<GarticWaitingStatusProps> = ({ state, myPlayerId }) => {
  const { t } = useTranslation();

  const finishedCount = state.players.filter((p) => isPlayerFinishedCurrentRound(state, p.id)).length;
  const totalCount = state.players.length;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: 0,
        px: { xs: 1, sm: 2 },
        py: 2,
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 480,
          borderRadius: 3.5,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          bgcolor: 'background.paper',
          border: '1.5px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          {/* Header */}
          <Box display="flex" flexDirection="column" alignItems="center" textAlign="center" mb={2.5}>
            <CircularProgress color="secondary" size={40} thickness={4.5} sx={{ mb: 1.5 }} />
            <Typography variant="h6" fontWeight={800} gutterBottom>
              {t('gartic.waitingHeader', 'Warte auf die anderen Spieler...')}
            </Typography>
            <Chip
              label={t('gartic.waitingProgress', {
                done: finishedCount,
                total: totalCount,
                defaultValue: `${finishedCount} von ${totalCount} Spielern fertig`,
              })}
              color="primary"
              variant="outlined"
              size="small"
              sx={{ fontWeight: 700 }}
            />
          </Box>

          {/* Players Status List */}
          <List disablePadding>
            {state.players.map((player, idx) => {
              const isDone = isPlayerFinishedCurrentRound(state, player.id);
              const isMe = player.id === myPlayerId;

              return (
                <ListItem
                  key={player.id}
                  sx={{
                    px: 1.5,
                    py: 1,
                    my: 0.75,
                    borderRadius: 2.5,
                    bgcolor: isDone ? 'success.main' + '12' : isMe ? 'action.selected' : 'action.hover',
                    border: '1px solid',
                    borderColor: isDone ? 'success.main' : isMe ? 'primary.main' : 'divider',
                    transition: 'all 0.2s ease',
                  }}
                  secondaryAction={
                    isDone ? (
                      <Chip
                        icon={<CheckCircleRoundedIcon fontSize="small" />}
                        label={t('gartic.playerDone', 'Fertig')}
                        color="success"
                        size="small"
                        sx={{ fontWeight: 800 }}
                      />
                    ) : (
                      <Chip
                        icon={<HourglassTopRoundedIcon fontSize="small" sx={{ animation: 'spin 2s linear infinite' }} />}
                        label={
                          state.roundIndex === 0
                            ? t('gartic.playerWriting', 'Schreibt...')
                            : state.phase === 'drawing'
                              ? t('gartic.playerDrawing', 'Zeichnet...')
                              : t('gartic.playerGuessing', 'Rät...')
                        }
                        color="default"
                        variant="outlined"
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    )
                  }
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
                        fontWeight: 800,
                        width: 36,
                        height: 36,
                        fontSize: '0.95rem',
                      }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography fontWeight={700} variant="body2" noWrap sx={{ maxWidth: { xs: 130, sm: 190 } }}>
                        {player.name} {isMe && `(${t('common.you', 'Du')})`}
                      </Typography>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};
