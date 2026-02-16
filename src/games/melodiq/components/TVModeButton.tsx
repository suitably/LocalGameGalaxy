import React from 'react';
import { IconButton, Tooltip, Badge, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
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
    isPresentationAvailable,
    onOpenTV,
    onStartPresentation,
    onDisconnect
}) => {

    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        // If connected, or presentation available, show menu
        if (isTVConnected || isPresentationAvailable) {
            setAnchorEl(event.currentTarget);
        } else {
            // Default to opening window if no cast available and not connected
            onOpenTV();
        }
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


    return (
        <>
            <Tooltip title={isTVConnected ? "TV Connected" : (isPresentationAvailable ? "Connect to TV" : "Open TV Window")}>
                <IconButton color="inherit" onClick={handleClick}>
                    <Badge color="success" variant="dot" invisible={!isTVConnected}>
                        {isTVConnected ? <CastConnectedIcon /> : (isPresentationAvailable ? <CastIcon /> : <TvIcon />)}
                    </Badge>
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
            >
                {!isTVConnected && isPresentationAvailable && (
                    <MenuItem onClick={handleCast}>
                        <ListItemIcon><CastIcon fontSize="small" /></ListItemIcon>
                        <ListItemText>Cast to TV</ListItemText>
                    </MenuItem>
                )}
                {!isTVConnected && (
                    <MenuItem onClick={handleWindow}>
                        <ListItemIcon><OpenInNewIcon fontSize="small" /></ListItemIcon>
                        <ListItemText>Open Window</ListItemText>
                    </MenuItem>
                )}
                {isTVConnected && (
                    <MenuItem onClick={handleDisconnect}>
                        <ListItemIcon><CancelIcon fontSize="small" /></ListItemIcon>
                        <ListItemText>Disconnect</ListItemText>
                    </MenuItem>
                )}
            </Menu>
        </>
    );
};
