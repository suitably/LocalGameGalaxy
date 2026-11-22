/**
 * Games that can be launched in the room [ID: COMP-PARTY-GAME-SELECTION]
 */
import React from 'react';
import { alpha, Box, Button, Card, Chip, Typography } from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { useTranslation } from 'react-i18next';
import type { PartyLobbyController } from '../hooks/usePartyLobbyController';

export const PartyGameSelection: React.FC<{ lobby: PartyLobbyController }> = ({ lobby }) => {
  const { t } = useTranslation();
  const { setPickerOpen, amIHost } = lobby;
  return (
    <>
      {/* Game Selection Section */}
      <Box>
        <Box mb={2}>
          <Typography variant="h6" fontWeight={800} color="primary.main">
            {t('party.categoryAvailableGames')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {amIHost ? t('party.hostSelectPrompt') : t('party.guestWaitingPrompt')}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr' },
            gap: 2,
          }}
        >
          {/* GuessArt Card */}
          <Card
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1.5px solid',
              borderColor: 'primary.main',
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 2,
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: (theme) => `0 6px 20px ${alpha(theme.palette.secondary.main, 0.15)}`,
              },
            }}
          >
            <Box>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="h6" fontWeight={800} color="primary.main">
                  {t('party.gameSelectionTitle')}
                </Typography>
                <Chip
                  label={t('party.partyModeChip')}
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {t('party.gameSelectionDesc')}
              </Typography>
            </Box>

            {amIHost ? (
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={() => setPickerOpen(true)}
                startIcon={<PlayArrowRoundedIcon />}
                sx={{
                  fontWeight: 800,
                  borderRadius: 3,
                  py: 1.2,
                  boxShadow: (theme) => `0 4px 14px ${alpha(theme.palette.secondary.main, 0.35)}`,
                }}
              >
                {t('party.chooseAndStart')}
              </Button>
            ) : (
              <Chip
                label={t('party.guestWaitingPrompt')}
                variant="outlined"
                color="primary"
                sx={{
                  fontWeight: 'bold',
                  height: 'auto',
                  minHeight: 44,
                  py: 1,
                  '& .MuiChip-label': { whiteSpace: 'normal', textAlign: 'center' },
                }}
              />
            )}
          </Card>
        </Box>
      </Box>
    </>
  );
};
