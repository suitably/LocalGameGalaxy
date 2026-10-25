import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, Box } from '@mui/material';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import TransferWithinAStationRoundedIcon from '@mui/icons-material/TransferWithinAStationRounded';
import PhonelinkRingRoundedIcon from '@mui/icons-material/PhonelinkRingRounded';
import FeedbackIcon from '@mui/icons-material/FeedbackRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { hasGitHubPAT } from '../../../lib/github';

interface GuessArtHeaderMenuProps {
  onOpenShareLinks?: () => void;
  onToggleLocalRemote?: () => void;
  canToggleLocalRemote: boolean;
  isCurrentTurnLocal: boolean;
  /** Name of the player whose turn can be switched between local and remote. */
  switchName: string;
  onEditGame?: () => void;
  onOpenHistory?: () => void;
}

/** Overflow ("more actions") menu of the GuessArt header. */
export const GuessArtHeaderMenu: React.FC<GuessArtHeaderMenuProps> = ({
  onOpenShareLinks,
  onToggleLocalRemote,
  canToggleLocalRemote,
  isCurrentTurnLocal,
  switchName,
  onEditGame,
  onOpenHistory,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  return (
    <>
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
                  name: switchName,
                  defaultValue: 'Zu Remote wechseln',
                })
              : t('guessart.switchToLocal', {
                  name: switchName,
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
    </>
  );
};
