import React, { useState } from 'react';
import {
  AppBar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  Chip,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import PhonelinkRingRoundedIcon from '@mui/icons-material/PhonelinkRingRounded';
import TransferWithinAStationRoundedIcon from '@mui/icons-material/TransferWithinAStationRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { useTranslation } from 'react-i18next';
import type { StoryGameRecord } from '../types';

interface StoryHeaderProps {
  game: StoryGameRecord;
  roomId?: string;
  onExit: () => void;
  onOpenReader: () => void;
  onOpenEdit?: () => void;
  onShareTurn?: () => void;
  onOpenShare?: () => void;
  isCurrentTurnLocal?: boolean;
  canToggleLocalRemote?: boolean;
  onToggleLocalRemote?: () => void;
}

export const StoryHeader: React.FC<StoryHeaderProps> = ({
  game,
  roomId,
  onExit,
  onOpenReader,
  onOpenEdit,
  onShareTurn,
  onOpenShare,
  isCurrentTurnLocal = true,
  canToggleLocalRemote = true,
  onToggleLocalRemote,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

  const activePlayer = game.players[game.currentPlayerIndex] || {
    name: t('storyteller.defaultPlayer', 'Spieler'),
  };

  const handleShare = () => {
    if (onOpenShare) {
      onOpenShare();
    } else if (onShareTurn) {
      onShareTurn();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setMenuAnchorEl(null);
  };

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
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 1, sm: 2 }, gap: 1 }}>
        <Tooltip title={t('common.exit', 'Beenden')}>
          <IconButton edge="start" color="inherit" onClick={onExit} size="small">
            <ArrowBackRoundedIcon />
          </IconButton>
        </Tooltip>

        <Box sx={{ minWidth: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ color: '#fff' }}>
              {game.name || t('games.storyteller.title', 'Geschichtenschreiber')}
            </Typography>
            {roomId && (
              <Chip
                size="small"
                label={roomId}
                color="primary"
                sx={{ height: 22, fontWeight: 700, fontSize: '0.75rem' }}
              />
            )}
            <Chip
              size="small"
              label={`${t('storyteller.turnLabel', 'Zug')} ${game.turnNumber}`}
              sx={{
                bgcolor: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                fontWeight: 600,
                height: 22,
              }}
            />
          </Box>

          <Typography variant="caption" noWrap sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            {t('storyteller.currentTurnOf', 'Am Zug: ')}
            <strong style={{ color: '#38bdf8' }}>{activePlayer.name}</strong>
            {!isCurrentTurnLocal && ` (${t('storyteller.remotePlayer', 'Remote')})`}
          </Typography>
        </Box>

        {/* Read full story */}
        <Tooltip title={t('storyteller.readStory', 'Geschichte lesen')}>
          <IconButton color="inherit" onClick={onOpenReader} size="small">
            <MenuBookRoundedIcon />
          </IconButton>
        </Tooltip>

        {/* Share turn */}
        {onShareTurn && (
          <Tooltip title={copied ? t('common.copied', 'Kopiert!') : t('common.share', 'Teilen')}>
            <IconButton color="inherit" onClick={handleShare} size="small">
              {copied ? <CheckRoundedIcon sx={{ color: '#4ade80' }} /> : <ShareRoundedIcon />}
            </IconButton>
          </Tooltip>
        )}

        {/* Overflow Menu */}
        <IconButton
          color="inherit"
          size="small"
          onClick={(e) => setMenuAnchorEl(e.currentTarget)}
        >
          <MoreVertRoundedIcon />
        </IconButton>

        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={() => setMenuAnchorEl(null)}
        >
          {onOpenEdit && (
            <MenuItem
              onClick={() => {
                setMenuAnchorEl(null);
                onOpenEdit();
              }}
            >
              <EditRoundedIcon sx={{ mr: 1.5, fontSize: 20 }} />
              {t('storyteller.editStory', 'Geschichte bearbeiten')}
            </MenuItem>
          )}

          {canToggleLocalRemote && onToggleLocalRemote && (
            <MenuItem
              onClick={() => {
                setMenuAnchorEl(null);
                onToggleLocalRemote();
              }}
            >
              {isCurrentTurnLocal ? (
                <>
                  <PhonelinkRingRoundedIcon sx={{ mr: 1.5, fontSize: 20 }} />
                  {t('storyteller.markAsRemote', 'Als Remote markieren')}
                </>
              ) : (
                <>
                  <TransferWithinAStationRoundedIcon sx={{ mr: 1.5, fontSize: 20 }} />
                  {t('storyteller.claimLocalTurn', 'Auf diesem Gerät spielen')}
                </>
              )}
            </MenuItem>
          )}
        </Menu>
      </Toolbar>
    </AppBar>
  );
};
