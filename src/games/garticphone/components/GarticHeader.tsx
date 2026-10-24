import React, { useState } from 'react';
import { Box, Button, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import BrushRoundedIcon from '@mui/icons-material/BrushRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import CreateRoundedIcon from '@mui/icons-material/CreateRounded';
import CelebrationRoundedIcon from '@mui/icons-material/CelebrationRounded';
import StopCircleRoundedIcon from '@mui/icons-material/StopCircleRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import { useTranslation } from 'react-i18next';
import { GarticEndGameDialog, GarticShareDialog } from './GarticHeaderDialogs';
import type { GarticGameState } from '../types';

interface GarticHeaderProps {
  roomId: string;
  playerName: string;
  phase: GarticGameState['phase'];
  roundIndex: number;
  totalRounds: number;
  revealBookIndex?: number;
  totalBooks?: number;
  onBack: () => void;
  isHost?: boolean;
  onEndGame?: () => void;
}

export const GarticHeader: React.FC<GarticHeaderProps> = ({
  roomId,
  playerName,
  phase,
  roundIndex,
  totalRounds,
  revealBookIndex = 0,
  totalBooks = 0,
  onBack,
  isHost,
  onEndGame,
}) => {
  const { t } = useTranslation();
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const isPrompt = phase === 'prompt';
  const isDrawing = phase === 'drawing';
  const isGuessing = phase === 'guessing';
  const isReveal = phase === 'reveal';

  const phaseLabel = isPrompt
    ? t('gartic.phasePrompt', 'Satz schreiben')
    : isDrawing
      ? t('gartic.phaseDrawing', 'Zeichnen')
      : isGuessing
        ? t('gartic.phaseGuessing', 'Zeichnung beschreiben')
        : t('gartic.phaseReveal', 'Album-Show');

  const PhaseIcon = isPrompt
    ? CreateRoundedIcon
    : isDrawing
      ? BrushRoundedIcon
      : isGuessing
        ? PsychologyRoundedIcon
        : CelebrationRoundedIcon;

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 1, sm: 2 },
          py: 0.8,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          flexWrap: 'nowrap',
          gap: 1,
          flexShrink: 0,
        }}
      >
        {/* Left: Back Arrow + Game Title + Room Code + Share Button */}
        <Box display="flex" alignItems="center" gap={1} minWidth={0}>
          <Tooltip title={t('party.backToLobby', 'Zurück zur Party-Lobby')}>
            <IconButton size="small" onClick={onBack} aria-label={t('common.back', 'Zurück')}>
              <ArrowBackRoundedIcon />
            </IconButton>
          </Tooltip>
          <Box display="flex" alignItems="center" gap={0.8} minWidth={0}>
            <Typography variant="subtitle1" fontWeight={800} noWrap lineHeight={1.2}>
              Gartic Phone
            </Typography>
            <Chip
              label={roomId}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem', height: 20, fontWeight: 700 }}
            />
          </Box>
          <Tooltip title={t('party.shareLobbyTooltip', 'Lobby teilen / Freunde einladen')}>
            <IconButton
              size="small"
              color="primary"
              onClick={() => setShareOpen(true)}
              sx={{
                bgcolor: 'action.hover',
                '&:hover': { bgcolor: 'action.selected' },
              }}
            >
              <ShareRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Right: Player Name + Round/Album + Phase Badge + Host End Game */}
        <Box display="flex" alignItems="center" gap={0.8} flexShrink={0}>
          <Chip
            label={playerName || t('common.you', 'Du')}
            color="secondary"
            size="small"
            sx={{ fontWeight: 800, height: 24 }}
          />

          {!isReveal ? (
            <Chip
              label={`${t('guessart.roundHeader', { round: roundIndex + 1, defaultValue: `Runde ${roundIndex + 1}` })} / ${totalRounds}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem', height: 24, fontWeight: 700 }}
            />
          ) : (
            <Chip
              label={`${t('gartic.albumHeader', 'Album')} ${revealBookIndex + 1}/${totalBooks}`}
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ fontSize: '0.75rem', height: 24, fontWeight: 700 }}
            />
          )}

          <Chip
            icon={<PhaseIcon fontSize="small" />}
            label={phaseLabel}
            color={isDrawing ? 'primary' : isGuessing ? 'warning' : 'secondary'}
            size="small"
            sx={{ fontWeight: 700, height: 24, display: { xs: 'none', sm: 'inline-flex' } }}
          />

          {isHost && onEndGame && (
            <Tooltip title={t('party.endGameForEveryone', 'Spiel für alle beenden')}>
              <Button
                size="small"
                color="error"
                variant="outlined"
                startIcon={<StopCircleRoundedIcon />}
                onClick={() => setConfirmEndOpen(true)}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  height: 26,
                  px: 1,
                  borderRadius: 2,
                  textTransform: 'none',
                }}
              >
                {t('party.endGameBtn', 'Beenden')}
              </Button>
            </Tooltip>
          )}
        </Box>
      </Box>

      <GarticShareDialog open={shareOpen} roomId={roomId} onClose={() => setShareOpen(false)} />
      <GarticEndGameDialog
        open={confirmEndOpen}
        onClose={() => setConfirmEndOpen(false)}
        onConfirm={() => {
          setConfirmEndOpen(false);
          onEndGame?.();
        }}
      />
    </>
  );
};
