import React from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import BrushRoundedIcon from '@mui/icons-material/BrushRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import TransferWithinAStationRoundedIcon from '@mui/icons-material/TransferWithinAStationRounded';
import { useTranslation } from 'react-i18next';
import type { GuessArtGameRecord, GuessArtRound } from '../logic/types';
import { playerAssignment } from '../logic/playerAssignment';

interface WaitingForDrawerViewProps {
  game: GuessArtGameRecord;
  round: GuessArtRound;
  isHost?: boolean;
  onOpenShareLinks?: () => void;
  onClaimPlayer?: (playerId: string) => void;
}

export const WaitingForDrawerView: React.FC<WaitingForDrawerViewProps> = ({
  game,
  round,
  isHost = false,
  onOpenShareLinks,
  onClaimPlayer,
}) => {
  const { t } = useTranslation();
  const drawerIdx = game.players.findIndex((p) => p.id === round.drawnById);
  const effectiveDrawerIdx = drawerIdx >= 0 ? drawerIdx : (Math.max(1, round.roundNumber) - 1) % (game.players.length || 1);
  const drawerName = game.players[effectiveDrawerIdx]?.name || round.drawnByName || 'Spieler 1';
  const guesserIdx = (effectiveDrawerIdx + 1) % (game.players.length || 1);
  const guesserName = game.players[guesserIdx]?.name || round.guesserName || 'Spieler 2';

  const isLocalGuesser = game.players[guesserIdx]
    ? playerAssignment.isPlayerLocal(game.id, game.players[guesserIdx].id)
    : false;

  const handleClaim = () => {
    playerAssignment.addLocalPlayerId(game.id, round.drawnById);
    if (onClaimPlayer) {
      onClaimPlayer(round.drawnById);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        p: { xs: 2, sm: 3 },
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: 3.5,
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            bgcolor: 'primary.light',
            color: 'primary.contrastText',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2.5,
            boxShadow: 2,
          }}
        >
          <BrushRoundedIcon sx={{ fontSize: 38 }} />
        </Box>

        <Typography variant="h5" fontWeight={800} gutterBottom>
          {t('guessart.waitingForDrawerTitle', { name: drawerName, defaultValue: `${drawerName} zeichnet gerade...` })}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {isLocalGuesser
            ? t(
                'guessart.waitingForDrawerDescLocalGuesser',
                { name: drawerName, defaultValue: `Sobald ${drawerName} fertig gezeichnet hat, startet hier direkt deine Raterunde!` },
              )
            : t(
                'guessart.waitingForDrawerDescSpectator',
                {
                  drawer: drawerName,
                  guesser: guesserName,
                  defaultValue: `${drawerName} zeichnet gerade für ${guesserName}. Sobald die Zeichnung fertig ist, geht es weiter.`,
                },
              )}
        </Typography>

        <Box display="flex" justifyContent="center" my={2}>
          <CircularProgress size={36} color="primary" />
        </Box>

        {isHost && (
          <Box display="flex" justifyContent="center" alignItems="center" gap={1.5} mt={3}>
            {onOpenShareLinks && (
              <Tooltip title={t('guessart.shareLinksTitle', 'Mitspieler-Links')}>
                <IconButton
                  color="primary"
                  onClick={onOpenShareLinks}
                  aria-label={t('guessart.shareLinksTitle', 'Mitspieler-Links')}
                  sx={{ bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', p: 1.2 }}
                >
                  <ShareRoundedIcon />
                </IconButton>
              </Tooltip>
            )}

            {onClaimPlayer && (
              <Tooltip
                title={t('guessart.drawHereInstead', {
                  name: drawerName,
                  defaultValue: `Hier als ${drawerName} zeichnen`,
                })}
              >
                <IconButton
                  color="secondary"
                  onClick={handleClaim}
                  aria-label={t('guessart.drawHereInstead', {
                    name: drawerName,
                    defaultValue: `Hier als ${drawerName} zeichnen`,
                  })}
                  sx={{ bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', p: 1.2 }}
                >
                  <TransferWithinAStationRoundedIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};
