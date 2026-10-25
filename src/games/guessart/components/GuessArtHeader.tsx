import React from 'react';
import { alpha, Box, Chip, IconButton, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import TransferWithinAStationRoundedIcon from '@mui/icons-material/TransferWithinAStationRounded';
import PhonelinkRingRoundedIcon from '@mui/icons-material/PhonelinkRingRounded';
import { useTranslation } from 'react-i18next';
import { GameHeaderBar } from '../../../components/common/GameHeaderBar';
import { GuessArtHeaderTitle } from './GuessArtHeaderTitle';
import { GuessArtHeaderMenu } from './GuessArtHeaderMenu';
import { gameNameOverride } from '../logic/gameNameOverride';
import type { GuessArtGameRecord, GuessArtRound } from '../logic/types';
import { getTurnPlayers } from '../logic/turnUtils';

interface GuessArtHeaderProps {
  game: GuessArtGameRecord;
  round: GuessArtRound;
  onExit: () => void;
  onOpenHistory?: () => void;
  onEditGame?: () => void;
  onOpenShareLinks?: () => void;
  isCurrentTurnLocal?: boolean;
  canToggleLocalRemote?: boolean;
  onToggleLocalRemote?: () => void;
  isTemporaryTurn?: boolean;
}

export const GuessArtHeader: React.FC<GuessArtHeaderProps> = ({
  game,
  round,
  onExit,
  onOpenHistory,
  onEditGame,
  onOpenShareLinks,
  isCurrentTurnLocal = true,
  canToggleLocalRemote = true,
  onToggleLocalRemote,
  isTemporaryTurn = false,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const handleShareLink = () => {
    onOpenShareLinks?.();
  };

  const { drawer, guesser } = getTurnPlayers(game, round);
  const currentDrawer = drawer?.name || round.drawnByName || 'Spieler 1';
  const currentGuesser = guesser?.name || round.guesserName || 'Spieler 2';
  const isDrawing = round.status === 'drawing' || round.status === 'selecting';
  const effectiveGameName = gameNameOverride.getEffectiveGameName(game.id, game.name);

  return (
    <GameHeaderBar
      toolbarSx={{
        alignItems: 'center',
        minHeight: { xs: 48, sm: 56 },
        px: { xs: 0.75, sm: 2 },
        justifyContent: 'space-between',
      }}
    >
      {/* Left: Back to Lobby */}
      <Tooltip title={t('common.back', 'Zurück')}>
        <IconButton
          size="medium"
          edge="start"
          color="inherit"
          aria-label={t('common.back', 'Zurück')}
          sx={{ mr: { xs: 0.5, sm: 1 }, p: { xs: 0.75, sm: 1 } }}
          onClick={onExit}
        >
          <ArrowBackRoundedIcon fontSize={isSmallScreen ? 'small' : 'medium'} />
        </IconButton>
      </Tooltip>

      {/* Center: Responsive GuessArt Title / Secret Word Badge */}
      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
        <GuessArtHeaderTitle
          game={game}
          round={round}
          isDrawing={isDrawing}
          isCurrentTurnLocal={isCurrentTurnLocal}
          currentDrawer={currentDrawer}
          currentGuesser={currentGuesser}
          effectiveGameName={effectiveGameName}
        />
      </Box>

      {/* Right Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.25, sm: 0.5 } }}>
        {isTemporaryTurn && (
          <Tooltip
            title={t(
              'guessart.temporaryTurnDesc',
              'Nur für diesen Zug lokal – danach wieder Remote',
            )}
          >
            <Chip
              icon={<TransferWithinAStationRoundedIcon fontSize="small" />}
              label={
                isSmallScreen
                  ? t('guessart.temporaryTurnShort', '1x')
                  : t('guessart.temporaryTurnChip', 'Einmaliger Zug')
              }
              size="small"
              color="warning"
              variant="outlined"
              sx={{
                fontWeight: 700,
                fontSize: '0.75rem',
                height: { xs: 24, sm: 26 },
                borderColor: 'warning.main',
                bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
              }}
            />
          </Tooltip>
        )}

        {/* Quick Remote/Local Toggle Button for Host */}
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
              color={isCurrentTurnLocal ? 'inherit' : 'secondary'}
              onClick={onToggleLocalRemote}
              aria-label="toggle remote"
              sx={{
                p: { xs: 0.75, sm: 1 },
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

        {/* Quick Share Game Link Button (Only for Host) */}
        {Boolean(onOpenShareLinks) && (
          <Tooltip title={t('guessart.shareGameLink', 'Spiel-Link teilen (Async Multiplayer)')}>
            <IconButton
              size="small"
              onClick={handleShareLink}
              color="inherit"
              aria-label={t('guessart.shareGameLink', 'Spiel-Link teilen')}
              sx={{
                p: { xs: 0.75, sm: 1 },
                border: '1px solid',
                borderColor: (theme) => alpha(theme.palette.text.primary, 0.15),
              }}
            >
              <ShareRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        <GuessArtHeaderMenu
          onOpenShareLinks={onOpenShareLinks}
          onToggleLocalRemote={onToggleLocalRemote}
          canToggleLocalRemote={canToggleLocalRemote}
          isCurrentTurnLocal={isCurrentTurnLocal}
          switchName={isDrawing ? currentDrawer : currentGuesser}
          onEditGame={onEditGame}
          onOpenHistory={onOpenHistory}
        />
      </Box>
    </GameHeaderBar>
  );
};
