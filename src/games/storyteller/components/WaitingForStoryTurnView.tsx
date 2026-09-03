import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import PhonelinkRingRoundedIcon from '@mui/icons-material/PhonelinkRingRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import TransferWithinAStationRoundedIcon from '@mui/icons-material/TransferWithinAStationRounded';
import { useTranslation } from 'react-i18next';
import type { StoryGameRecord } from '../types';

interface WaitingForStoryTurnViewProps {
  game: StoryGameRecord;
  roomId?: string;
  onClaimPlayer: (playerId: string) => void;
  onShareTurn?: () => void;
  onOpenShare?: () => void;
  onOpenReader: () => void;
}

export const WaitingForStoryTurnView: React.FC<WaitingForStoryTurnViewProps> = ({
  game,
  roomId,
  onClaimPlayer,
  onShareTurn,
  onOpenShare,
  onOpenReader,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const activePlayer = game.players[game.currentPlayerIndex] || {
    id: '',
    name: t('storyteller.defaultPlayer', 'Spieler'),
  };

  const handleCopyOrOpenShare = () => {
    if (onOpenShare) {
      onOpenShare();
    } else if (onShareTurn) {
      onShareTurn();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100%"
      p={2}
    >
      <Card
        variant="outlined"
        sx={{
          maxWidth: 440,
          width: '100%',
          bgcolor: 'rgba(15, 23, 42, 0.7)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
          textAlign: 'center',
          p: { xs: 2, sm: 3 },
        }}
      >
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress size={64} thickness={3} sx={{ color: '#38bdf8' }} />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PhonelinkRingRoundedIcon sx={{ color: '#38bdf8', fontSize: 28 }} />
            </Box>
          </Box>

          <Box>
            {roomId && (
              <Box mb={1}>
                <Chip
                  label={`${t('party.room', 'Raum')}: ${roomId}`}
                  color="primary"
                  sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}
                />
              </Box>
            )}
            <Typography variant="h6" fontWeight={700} sx={{ color: '#f8fafc' }}>
              {t('storyteller.waitingTitle', 'Warten auf')} {activePlayer.name}...
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
              {t(
                'storyteller.waitingSubtitle',
                'Dieser Spieler ist als Remote markiert. Sobald der Zug eingegangen ist, geht es hier automatisch weiter.',
              )}
            </Typography>
          </Box>

          <Stack spacing={1.5} width="100%" sx={{ mt: 1 }}>
            {onClaimPlayer && (
              <Button
                variant="contained"
                fullWidth
                color="primary"
                size="large"
                startIcon={<TransferWithinAStationRoundedIcon />}
                onClick={() => onClaimPlayer(activePlayer.id)}
                sx={{ fontWeight: 800, py: 1.2, borderRadius: 2 }}
              >
                {t('storyteller.playHereInstead', {
                  name: activePlayer.name,
                  defaultValue: `Hier als ${activePlayer.name} weiterschreiben`,
                })}
              </Button>
            )}

            {(onShareTurn || onOpenShare) && (
              <Button
                variant="outlined"
                fullWidth
                color="inherit"
                startIcon={copied ? <CheckRoundedIcon /> : <ShareRoundedIcon />}
                onClick={handleCopyOrOpenShare}
                sx={{
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  fontWeight: 600,
                }}
              >
                {copied
                  ? t('common.linkCopied', 'Zug-Link kopiert!')
                  : t('storyteller.shareTurnLink', 'QR-Code / Link für Mitspieler teilen')}
              </Button>
            )}

            <Button
              variant="text"
              fullWidth
              color="inherit"
              startIcon={<MenuBookRoundedIcon />}
              onClick={onOpenReader}
              sx={{ color: '#94a3b8' }}
            >
              {t('storyteller.readStorySoFar', 'Bisherige Geschichte ansehen')}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};
