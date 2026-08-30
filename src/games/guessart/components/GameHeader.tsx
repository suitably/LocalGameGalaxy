import React, { useState } from 'react';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import BrushRoundedIcon from '@mui/icons-material/BrushRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import TransferWithinAStationRoundedIcon from '@mui/icons-material/TransferWithinAStationRounded';
import PhonelinkRingRoundedIcon from '@mui/icons-material/PhonelinkRingRounded';
import { useTranslation } from 'react-i18next';
import LZString from 'lz-string';
import { gameNameOverride } from '../logic/gameNameOverride';
import type { GuessArtGameRecord, GuessArtRound } from '../logic/types';

interface GameHeaderProps {
  game: GuessArtGameRecord | null;
  round: GuessArtRound | null;
  onExit: () => void;
  onOpenHistory?: () => void;
  onEditGame?: () => void;
  onOpenShareLinks?: () => void;
  isCurrentTurnLocal?: boolean;
  canToggleLocalRemote?: boolean;
  onToggleLocalRemote?: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  game,
  round,
  onExit,
  onOpenHistory,
  onEditGame,
  onOpenShareLinks,
  isCurrentTurnLocal,
  canToggleLocalRemote = true,
  onToggleLocalRemote,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!game || !round) return null;

  const drawerIdx = game.players.findIndex((p) => p.id === round.drawnById);
  const effectiveDrawerIdx = drawerIdx >= 0 ? drawerIdx : (Math.max(1, round.roundNumber) - 1) % (game.players.length || 1);
  const effectiveGuesserIdx = (effectiveDrawerIdx + 1) % (game.players.length || 1);
  const currentDrawer = game.players[effectiveDrawerIdx]?.name || round.drawnByName || 'Spieler 1';
  const currentGuesser = game.players[effectiveGuesserIdx]?.name || round.guesserName || 'Spieler 2';
  const isDrawing = game.status === 'drawing' || game.status === 'selecting';

  const handleShareLink = () => {
    if (onOpenShareLinks) {
      onOpenShareLinks();
      return;
    }
    const snapshot = { game, round };
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(snapshot));
    const url = `${window.location.origin}${window.location.pathname}#/games/guessart?gameId=${game.id}&data=${compressed}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 1,
        py: 0.8,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box display="flex" alignItems="center" gap={1}>
        <IconButton size="small" onClick={onExit} aria-label={t('common.back', 'Back')}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box>
          <Box display="flex" alignItems="center" gap={0.8}>
            <Typography variant="subtitle1" fontWeight={800} lineHeight={1.2}>
              {currentDrawer} vs. {currentGuesser}
            </Typography>
            <Chip
              label={t('guessart.roundHeader', { round: round.roundNumber, defaultValue: `Runde ${round.roundNumber}` })}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem', height: 20 }}
            />
            {gameNameOverride.getEffectiveGameName(game.id, game.name) && (
              <Chip
                label={gameNameOverride.getEffectiveGameName(game.id, game.name)}
                size="small"
                variant="filled"
                sx={{ fontSize: '0.75rem', height: 20, bgcolor: 'action.selected' }}
              />
            )}
          </Box>
        </Box>
      </Box>

      <Box display="flex" alignItems="center" gap={0.8}>
        <Chip
          icon={isDrawing ? <BrushRoundedIcon fontSize="small" /> : <PsychologyRoundedIcon fontSize="small" />}
          label={
            isDrawing
              ? t('guessart.drawerLabel', { name: currentDrawer, defaultValue: `Zeichnet: ${currentDrawer}` })
              : t('guessart.guesserLabel', { name: currentGuesser, defaultValue: `Rät: ${currentGuesser}` })
          }
          color={isDrawing ? 'primary' : 'secondary'}
          size="small"
          sx={{ fontWeight: 600 }}
        />

        {onToggleLocalRemote && canToggleLocalRemote && (
          <Tooltip
            title={
              isCurrentTurnLocal
                ? t('guessart.switchToRemote', {
                    name: isDrawing ? currentDrawer : currentGuesser,
                    defaultValue: `Zu Remote wechseln (${isDrawing ? currentDrawer : currentGuesser} spielt auf anderem Gerät)`,
                  })
                : t('guessart.switchToLocal', {
                    name: isDrawing ? currentDrawer : currentGuesser,
                    defaultValue: `Hier lokal als ${isDrawing ? currentDrawer : currentGuesser} spielen`,
                  })
            }
          >
            <IconButton
              size="small"
              color={isCurrentTurnLocal ? 'default' : 'secondary'}
              onClick={onToggleLocalRemote}
              aria-label={
                isCurrentTurnLocal
                  ? t('guessart.switchToRemote', {
                      name: isDrawing ? currentDrawer : currentGuesser,
                      defaultValue: `Zu Remote wechseln (${isDrawing ? currentDrawer : currentGuesser} spielt auf anderem Gerät)`,
                    })
                  : t('guessart.switchToLocal', {
                      name: isDrawing ? currentDrawer : currentGuesser,
                      defaultValue: `Hier lokal als ${isDrawing ? currentDrawer : currentGuesser} spielen`,
                    })
              }
              sx={{
                border: '1px solid',
                borderColor: isCurrentTurnLocal ? 'divider' : 'secondary.main',
                bgcolor: isCurrentTurnLocal ? 'transparent' : 'action.hover',
              }}
            >
              {isCurrentTurnLocal ? (
                <PhonelinkRingRoundedIcon fontSize="small" />
              ) : (
                <TransferWithinAStationRoundedIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title={copied ? t('common.copied', 'Link kopiert!') : t('guessart.shareGameLink', 'Spiel-Link teilen (Async Multiplayer)')}>
          <IconButton
            size="small"
            onClick={handleShareLink}
            color={copied ? 'success' : 'default'}
            aria-label={t('guessart.shareGameLink', 'Spiel-Link teilen')}
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            {copied ? <CheckRoundedIcon fontSize="small" color="success" /> : <ShareRoundedIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        {onEditGame && (
          <Tooltip title={t('guessart.editGame', 'Spiel bearbeiten')}>
            <IconButton
              size="small"
              onClick={onEditGame}
              aria-label={t('guessart.editGame', 'Spiel bearbeiten')}
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <EditRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {onOpenHistory && (
          <Tooltip title={t('guessart.viewHistory', 'Historie ansehen')}>
            <IconButton
              size="small"
              onClick={onOpenHistory}
              color="primary"
              aria-label={t('guessart.viewHistory', 'Historie ansehen')}
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <HistoryRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

