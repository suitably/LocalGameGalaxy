import React, { useState } from 'react';
import {
  AppBar,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import TransferWithinAStationRoundedIcon from '@mui/icons-material/TransferWithinAStationRounded';
import PhonelinkRingRoundedIcon from '@mui/icons-material/PhonelinkRingRounded';
import FeedbackIcon from '@mui/icons-material/Feedback';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { GuessArtHeaderTitle } from './GuessArtHeaderTitle';
import { gameNameOverride } from '../logic/gameNameOverride';
import { hasGitHubPAT } from '../../../lib/github';
import type { GuessArtGameRecord, GuessArtRound } from '../logic/types';

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
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleShareLink = () => {
    if (onOpenShareLinks) {
      onOpenShareLinks();
      handleMenuClose();
    }
  };

  const drawerIdx = game.players.findIndex((p) => p.id === round.drawnById);
  const effectiveDrawerIdx =
    drawerIdx >= 0 ? drawerIdx : (Math.max(1, round.roundNumber) - 1) % (game.players.length || 1);
  const effectiveGuesserIdx = (effectiveDrawerIdx + 1) % (game.players.length || 1);
  const currentDrawer = game.players[effectiveDrawerIdx]?.name || round.drawnByName || 'Spieler 1';
  const currentGuesser = game.players[effectiveGuesserIdx]?.name || round.guesserName || 'Spieler 2';
  const isDrawing = round.status === 'drawing' || round.status === 'selecting';
  const effectiveGameName = gameNameOverride.getEffectiveGameName(game.id, game.name);

  return (
    <AppBar
      position="static"
      elevation={1}
      sx={{
        bgcolor: '#18181b',
        backgroundImage: 'none',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 1100,
      }}
    >
      <Toolbar
        sx={{
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
                'Nur für diesen Zug lokal – danach wieder Remote'
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
                  fontSize: '0.72rem',
                  height: { xs: 24, sm: 26 },
                  borderColor: 'warning.main',
                  bgcolor: 'rgba(237, 108, 2, 0.08)',
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
                  borderColor: isCurrentTurnLocal ? 'rgba(255, 255, 255, 0.15)' : 'secondary.main',
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
            <Tooltip
              title={t('guessart.shareGameLink', 'Spiel-Link teilen (Async Multiplayer)')}
            >
              <IconButton
                size="small"
                onClick={handleShareLink}
                color="inherit"
                aria-label={t('guessart.shareGameLink', 'Spiel-Link teilen')}
                sx={{
                  p: { xs: 0.75, sm: 1 },
                  border: '1px solid',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                }}
              >
                <ShareRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Overflow Menu (More Actions) */}
          <IconButton
            size="small"
            color="inherit"
            aria-label="more actions"
            onClick={handleMenuOpen}
            sx={{ p: { xs: 0.75, sm: 1 } }}
          >
            <MoreVertRoundedIcon fontSize="small" />
          </IconButton>

          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            {Boolean(onOpenShareLinks) && (
              <MenuItem onClick={handleShareLink} sx={{ minHeight: 44 }}>
                <Box component="span" sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>
                  <ShareRoundedIcon fontSize="small" />
                </Box>
                {t('guessart.shareGameLink', 'Spiel-Link teilen')}
              </MenuItem>
            )}

            {onToggleLocalRemote && canToggleLocalRemote && (
              <MenuItem
                onClick={() => {
                  onToggleLocalRemote();
                  handleMenuClose();
                }}
                sx={{ minHeight: 44 }}
              >
                <Box component="span" sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>
                  {isCurrentTurnLocal ? (
                    <PhonelinkRingRoundedIcon fontSize="small" />
                  ) : (
                    <TransferWithinAStationRoundedIcon fontSize="small" />
                  )}
                </Box>
                {isCurrentTurnLocal
                  ? t('guessart.switchToRemote', {
                      name: isDrawing ? currentDrawer : currentGuesser,
                      defaultValue: 'Zu Remote wechseln',
                    })
                  : t('guessart.switchToLocal', {
                      name: isDrawing ? currentDrawer : currentGuesser,
                      defaultValue: 'Hier lokal spielen',
                    })}
              </MenuItem>
            )}

            {onEditGame && (
              <MenuItem
                onClick={() => {
                  onEditGame();
                  handleMenuClose();
                }}
                sx={{ minHeight: 44 }}
              >
                <Box component="span" sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>
                  <EditRoundedIcon fontSize="small" />
                </Box>
                {t('guessart.editGame', 'Spiel bearbeiten')}
              </MenuItem>
            )}

            {onOpenHistory && (
              <MenuItem
                onClick={() => {
                  onOpenHistory();
                  handleMenuClose();
                }}
                sx={{ minHeight: 44 }}
              >
                <Box component="span" sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>
                  <HistoryRoundedIcon fontSize="small" />
                </Box>
                {t('guessart.viewHistory', 'Historie ansehen')}
              </MenuItem>
            )}

            <MenuItem
              onClick={() => {
                handleMenuClose();
                if (!hasGitHubPAT()) {
                  navigate('/settings?tab=general&sub=feedback&missing_pat=1');
                } else {
                  window.dispatchEvent(new Event('feedback:open'));
                }
              }}
              sx={{ minHeight: 44 }}
            >
              <Box component="span" sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>
                <FeedbackIcon fontSize="small" />
              </Box>
              {t('settings.feedback_title', 'Feedback & Fehler melden')}
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
