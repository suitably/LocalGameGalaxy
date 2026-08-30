import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import BrushRoundedIcon from '@mui/icons-material/BrushRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import CreateRoundedIcon from '@mui/icons-material/CreateRounded';
import CelebrationRoundedIcon from '@mui/icons-material/CelebrationRounded';
import StopCircleRoundedIcon from '@mui/icons-material/StopCircleRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
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
  const [copied, setCopied] = useState(false);

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

  const buildShareUrl = () => {
    const isProd = window.location.hostname.includes('github.io');
    const base = isProd
      ? `${window.location.origin}${window.location.pathname}`
      : `${window.location.protocol}//${window.location.hostname}:${window.location.port}${window.location.pathname}`;
    return `${base}#/party?room=${roomId}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(buildShareUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

      {/* Share Lobby Dialog */}
      <Dialog open={shareOpen} onClose={() => setShareOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShareRoundedIcon color="primary" /> {t('party.shareLobby', 'Lobby teilen')}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {t('party.shareLobbyDesc', 'Teile diesen Link oder scanne den QR-Code, um weitere Freunde ins Spiel einzuladen:')}
          </Typography>

          <Paper sx={{ p: 2, bgcolor: '#ffffff', borderRadius: 2 }}>
            <QRCodeSVG value={buildShareUrl()} size={180} />
          </Paper>

          <Chip
            label={`${t('party.room', 'Raum')}: ${roomId}`}
            color="primary"
            variant="filled"
            sx={{ fontWeight: 800, fontSize: '1rem', px: 1, py: 2 }}
          />

          <Button
            fullWidth
            variant="contained"
            color={copied ? 'success' : 'primary'}
            startIcon={copied ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}
            onClick={handleCopyLink}
            sx={{ fontWeight: 800, py: 1.2, borderRadius: 2 }}
          >
            {copied ? t('common.copied', 'Link kopiert!') : t('common.copyLink', 'Link kopieren')}
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareOpen(false)}>{t('common.close', 'Schließen')}</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm End Game Dialog */}
      <Dialog open={confirmEndOpen} onClose={() => setConfirmEndOpen(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {t('party.confirmEndTitle', 'Spiel wirklich beenden?')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t('party.confirmEndDesc', 'Das aktuelle Gartic Phone Spiel wird für alle verbundenen Spieler abgebrochen und alle kehren zur Party-Lobby zurück.')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEndOpen(false)}>
            {t('common.cancel', 'Abbrechen')}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setConfirmEndOpen(false);
              onEndGame?.();
            }}
          >
            {t('party.endGameBtn', 'Beenden')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
