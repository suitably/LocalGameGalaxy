import React from 'react';
import {
  IconButton,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import TvIcon from '@mui/icons-material/Tv';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CastIcon from '@mui/icons-material/Cast';
import CastConnectedIcon from '@mui/icons-material/CastConnected';
import CancelIcon from '@mui/icons-material/Cancel';

interface TVModeButtonProps {
  isTVConnected: boolean;
  isPresentationAvailable: boolean;
  onOpenTV: () => void;
  onStartPresentation: () => void;
  onDisconnect: () => void;
}

export const TVModeButton: React.FC<TVModeButtonProps> = ({
  isTVConnected,
  onOpenTV,
  onStartPresentation,
  onDisconnect,
}) => {
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

  const hasPresentationAPI = typeof window !== 'undefined' && 'PresentationRequest' in window;

  return (
    <>
      <Tooltip
        title={
          isTVConnected ? 'TV Connected' : hasPresentationAPI ? 'Connect to TV' : 'Open TV Window'
        }
      >
        <IconButton color="inherit" onClick={handleClick}>
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
            <ListItemText>Cast to TV</ListItemText>
          </MenuItem>
        )}
        {!isTVConnected && (
          <MenuItem onClick={handleWindow}>
            <ListItemIcon>
              <OpenInNewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Open Window</ListItemText>
          </MenuItem>
        )}
        {isTVConnected && (
          <MenuItem onClick={handleDisconnect}>
            <ListItemIcon>
              <CancelIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Disconnect</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};
