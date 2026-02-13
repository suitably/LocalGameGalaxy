import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Menu, MenuItem, Box, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import { useTranslation } from 'react-i18next';
import { useLayout } from '../../context/LayoutContext';
import { useTitle } from '../../context/TitleContext';
import { useNavigate } from 'react-router-dom';

export const GlobalHeader: React.FC = () => {
    const { t } = useTranslation();
    const { title, menuItems, homeAction, customHeaderActions } = useLayout();
    const { pageTitle } = useTitle();
    const navigate = useNavigate();
    const theme = useTheme();
    const isLargeScreen = useMediaQuery(theme.breakpoints.up('md'));

    // State for Burger Menu
    const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(null);

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setMenuAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
    };

    const handleAction = (action: () => void) => {
        action();
        handleMenuClose();
    };

    const handleHomeClick = () => {
        if (homeAction) {
            homeAction();
        } else {
            navigate('/');
        }
    };

    // Strict Responsive Logic:
    // Large Screen: Show ALL items in toolbar.
    // Small Screen: Show ALL items in burger menu.
    const visibleInToolbar = isLargeScreen ? menuItems : [];
    const overflowItems = isLargeScreen ? [] : menuItems;

    return (
        <AppBar position="static">
            <Toolbar>
                <IconButton
                    size="large"
                    edge="start"
                    color="inherit"
                    aria-label="home"
                    sx={{ mr: 2 }}
                    onClick={handleHomeClick}
                >
                    <HomeIcon />
                </IconButton>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {title || pageTitle || t('app.title')}
                </Typography>

                {/* Always Visible Actions (Custom actions lik CastButton usually stay visible) */}
                {customHeaderActions}

                {/* Toolbar Items (Desktop) */}
                {visibleInToolbar.map((item, index) => (
                    <Tooltip key={index} title={item.label}>
                        <span>
                            <IconButton
                                color="inherit"
                                onClick={item.action}
                                disabled={item.disabled}
                            >
                                {item.icon}
                            </IconButton>
                        </span>
                    </Tooltip>
                ))}

                {/* Burger Menu (Mobile - ONLY if there are overflow items) */}
                {overflowItems.length > 0 && (
                    <div>
                        <IconButton
                            size="large"
                            aria-label="menu"
                            aria-controls="menu-appbar"
                            aria-haspopup="true"
                            onClick={handleMenuOpen}
                            color="inherit"
                        >
                            <MenuIcon />
                        </IconButton>
                        <Menu
                            id="menu-appbar"
                            anchorEl={menuAnchorEl}
                            anchorOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            keepMounted
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            open={Boolean(menuAnchorEl)}
                            onClose={handleMenuClose}
                        >
                            {overflowItems.map((item, index) => (
                                <MenuItem
                                    key={index}
                                    onClick={() => handleAction(item.action)}
                                    disabled={item.disabled}
                                >
                                    {item.icon && <Box component="span" sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>{item.icon}</Box>}
                                    {item.label}
                                </MenuItem>
                            ))}
                        </Menu>
                    </div>
                )}
            </Toolbar >
        </AppBar >
    );
};
