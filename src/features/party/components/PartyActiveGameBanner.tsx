/**
 * Banner shown while a game is running in this room [ID: COMP-PARTY-ACTIVE-GAME-BANNER]
 */
import React from 'react';
import { alpha, Box, Button, Card, Chip, Typography } from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PhoneIphoneRoundedIcon from '@mui/icons-material/PhoneIphoneRounded';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { PartyLobbyController } from '../hooks/usePartyLobbyController';

export const PartyActiveGameBanner: React.FC<{ lobby: PartyLobbyController }> = ({ lobby }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { roomState, getGameRoute, handleReturnToLobby, amIHost } = lobby;
  return (
    <>
      {/* Active Live Game Banner (when user returned to lobby while game is running) */}
      {roomState?.status === 'in_game' && (
        <Card
          elevation={3}
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 3,
            border: '2px solid',
            borderColor: 'primary.main',
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.secondary.main, 0.4)}`,
              }}
            >
              <PhoneIphoneRoundedIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip
                  label={t('party.liveGameActive', 'Live Spiel läuft')}
                  color="error"
                  size="small"
                  sx={{ fontWeight: 800, height: 22 }}
                />
                <Typography variant="h6" fontWeight={800}>
                  {roomState?.activeGame === 'tabletop'
                    ? 'Tabletop Spiel'
                    : roomState?.activeGame === 'garticphone'
                      ? 'Gartic Phone'
                      : 'GuessArt'}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {t(
                  'party.rejoinGameDesc',
                  'Das Spiel läuft gerade. Du kannst jederzeit beitreten oder fortsetzen.',
                )}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" gap={1} width={{ xs: '100%', sm: 'auto' }} flexWrap="wrap">
            {amIHost && (
              <Button
                variant="outlined"
                color="inherit"
                onClick={handleReturnToLobby}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                {t('party.endGameForEveryone', 'Spiel beenden')}
              </Button>
            )}
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<PlayArrowRoundedIcon />}
              onClick={() =>
                navigate(
                  getGameRoute(roomState?.activeGame || 'guessart', roomState?.tabletopGameId),
                )
              }
              sx={{
                fontWeight: 800,
                borderRadius: 2,
                flexGrow: { xs: 1, sm: 0 },
                py: 1.2,
                px: 3,
              }}
            >
              {t('party.rejoinGame', 'Spiel beitreten / fortsetzen')}
            </Button>
          </Box>
        </Card>
      )}
    </>
  );
};
