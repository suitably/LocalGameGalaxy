import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconButton,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import TvIcon from '@mui/icons-material/TvRounded';
import OpenInNewIcon from '@mui/icons-material/OpenInNewRounded';
import CastIcon from '@mui/icons-material/CastRounded';
import CastConnectedIcon from '@mui/icons-material/CastConnectedRounded';
import CancelIcon from '@mui/icons-material/CancelRounded';
import { canTryPresentation, currentScreenPlatform } from '../../../lib/secondScreen';

interface TVModeButtonProps {
  isTVConnected: boolean;
  isPresentationAvailable: boolean;
  onOpenTV: () => void;
  onStartPresentation: () => void;
  onDisconnect: () => void;
}

export const TVModeButton: React.FC<TVModeButtonProps> = ({
  isTVConnected,
  isPresentationAvailable,
  onOpenTV,
  onStartPresentation,
  onDisconnect,
}) => {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    // Always show the menu to let the user select between Casting or Opening a Window
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCast = () => {
    onStartPresentation();
    handleClose();
  };

  const handleWindow = () => {
    onOpenTV();
    handleClose();
  };

  const handleDisconnect = () => {
    onDisconnect();
    handleClose();
  };

  const hasPresentationAPI =
    canTryPresentation(currentScreenPlatform()) && isPresentationAvailable !== false;

  return (
    <>
      <Tooltip
        title={
          isTVConnected
            ? t('melodiq.tv_menu.connected')
            : hasPresentationAPI
              ? t('melodiq.tv_menu.connect')
              : t('melodiq.tv_menu.open_window_tooltip')
        }
      >
        <IconButton
          color="inherit"
          onClick={handleClick}
          aria-label={t('melodiq.tv_menu.open_window_tooltip')}
        >
          <Badge color="success" variant="dot" invisible={!isTVConnected}>
            {isTVConnected ? <CastConnectedIcon /> : hasPresentationAPI ? <CastIcon /> : <TvIcon />}
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {!isTVConnected && hasPresentationAPI && (
          <MenuItem onClick={handleCast}>
            <ListItemIcon>
              <CastIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('melodiq.tv_menu.cast')}</ListItemText>
          </MenuItem>
        )}
        {!isTVConnected && (
          <MenuItem onClick={handleWindow}>
            <ListItemIcon>
              <OpenInNewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('melodiq.tv_menu.open_window')}</ListItemText>
          </MenuItem>
        )}
        {isTVConnected && (
          <MenuItem onClick={handleDisconnect}>
            <ListItemIcon>
              <CancelIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('melodiq.tv_menu.disconnect')}</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};
