import React from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import TransferWithinAStationRoundedIcon from '@mui/icons-material/TransferWithinAStationRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import { useTranslation } from 'react-i18next';
import { ExcalidrawViewer } from './ExcalidrawViewer';
import type { GuessArtGameRecord, GuessArtRound } from '../logic/types';
import { playerAssignment } from '../logic/playerAssignment';

interface WaitingForGuesserViewProps {
  game: GuessArtGameRecord;
  round: GuessArtRound;
  isHost?: boolean;
  onOpenShareLinks?: () => void;
  onClaimPlayer?: (playerId: string) => void;
}

export const WaitingForGuesserView: React.FC<WaitingForGuesserViewProps> = ({
  game,
  round,
  isHost = false,
  onOpenShareLinks,
  onClaimPlayer,
}) => {
  const { t } = useTranslation();
  const dIdx = game.players.findIndex((p) => p.id === round.drawnById);
  const effDIdx = dIdx >= 0 ? dIdx : (Math.max(1, round.roundNumber) - 1) % (game.players.length || 1);
  const guesserPlayer = game.players[(effDIdx + 1) % (game.players.length || 1)];
  const guesserName = guesserPlayer?.name || round.guesserName || 'Spieler 2';

  const handleClaim = () => {
    if (guesserPlayer) {
      playerAssignment.claimTurnTemporary(game.id, guesserPlayer.id);
      if (onClaimPlayer) {
        onClaimPlayer(guesserPlayer.id);
      }
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Drawing Preview Area */}
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          position: 'relative',
          borderRadius: 2.5,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <ExcalidrawViewer data={round.canvasData} />
      </Box>

      {/* Previous Guesses (if any) */}
      {round.guesses && round.guesses.length > 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: 1,
            mt: 1,
            borderRadius: 2,
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            {t('guessart.guessesHistoryLabel', 'Bisherige Versuche:')}
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {round.guesses.map((g, idx) => (
              <Chip key={idx} label={g} size="small" variant="outlined" sx={{ textDecoration: 'line-through' }} />
            ))}
          </Stack>
        </Paper>
      )}

      {/* Status & Actions Bar */}
      <Paper
        variant="outlined"
        sx={{
          p: 1.25,
          mt: 1,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PsychologyRoundedIcon color="secondary" sx={{ fontSize: 22 }} />
          <Typography variant="body2" fontWeight={600}>
            {t('guessart.waitingForGuesserDesc', {
              name: guesserName,
              defaultValue: `${guesserName} rät gerade...`,
            })}
          </Typography>
        </Box>

        {isHost && (
          <Stack direction="row" spacing={1} alignItems="center">
            {onOpenShareLinks && (
              <Tooltip title={t('guessart.shareLinksTitle', 'Mitspieler-Links')}>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={onOpenShareLinks}
                  aria-label={t('guessart.shareLinksTitle', 'Mitspieler-Links')}
                  sx={{ bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', p: 0.75 }}
                >
                  <ShareRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {onClaimPlayer && guesserPlayer && (
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                startIcon={<TransferWithinAStationRoundedIcon />}
                onClick={handleClaim}
                sx={{ fontWeight: 700 }}
              >
                {t('guessart.guessHereInstead', {
                  name: guesserName,
                  defaultValue: `Hier als ${guesserName} raten`,
                })}
              </Button>
            )}
          </Stack>
        )}
      </Paper>
    </Box>
  );
};
