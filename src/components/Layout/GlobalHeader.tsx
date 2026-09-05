import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Menu, MenuItem, Box, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';
import FeedbackIcon from '@mui/icons-material/Feedback';
import InstallMobileIcon from '@mui/icons-material/InstallMobile';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useTranslation } from 'react-i18next';
import { useLayout } from '../../context/LayoutContext';
import { useTitle } from '../../context/TitleContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { gameRegistry } from '../../lib/gameRegistry';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallDialog } from '../pwa/PWAInstallDialog';

import { SettingsHeaderToolbar, SettingsHeaderSubNav } from '../../features/settings/components/SettingsHeaderNav';
import { hasGitHubPAT } from '../../lib/github';

export const GlobalHeader: React.FC = () => {
    const { t } = useTranslation();
    const { title, customHeaderTitle, menuItems, homeAction, customHeaderActions } = useLayout();
    const { pageTitle } = useTitle();
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isLargeScreen = useMediaQuery(theme.breakpoints.up('md'));
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const activeGame = gameRegistry.findGameByPath(location.pathname);
    const hasSettings = activeGame?.hasSettings ?? false;
    const isSettingsPage = location.pathname === '/settings';
    const { isStandalone, isInstallable, installApp, showIOSGuide, setShowIOSGuide } = usePWAInstall();

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
        } else if (isSettingsPage) {
            const searchParams = new URLSearchParams(location.search);
            const game = searchParams.get('game');
            const from = (location.state as any)?.from;

            if (from && typeof from === 'string' && from !== '/settings') {
                navigate(from);
            } else if (game) {
                navigate(`/games/${game}`);
            } else {
                navigate('/');
            }
        } else {
            navigate('/');
        }
    };

    // Responsive Logic:
    // Large Screen: Show ALL items in toolbar.
    // Small Screen: ALL items go into burger menu for a clean header.
    const visibleInToolbar = isLargeScreen ? menuItems : [];
    const overflowItems = isLargeScreen ? [] : menuItems;

    return (
        <>
            <AppBar 
                position="static" 
                elevation={1}
                sx={{ 
                    bgcolor: '#18181b',
                    backgroundImage: 'none',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                }}
            >
                <Toolbar sx={{ alignItems: 'center', minHeight: { xs: 48, sm: 56 }, px: { xs: 1, sm: 2 } }}>
                    <Tooltip title={(homeAction || isSettingsPage) ? t('common.back', 'Zurück') : t('common.home', 'Home')}>
                        <IconButton
                            size="medium"
                            edge="start"
                            color="inherit"
                            aria-label={(homeAction || isSettingsPage) ? t('common.back', 'Zurück') : "home"}
                            sx={{ mr: { xs: 0.5, sm: 1.5 }, p: { xs: 0.75, sm: 1.25 } }}
                            onClick={handleHomeClick}
                        >
                            {(homeAction || isSettingsPage) ? (
                                <ArrowBackRoundedIcon fontSize={isSmallScreen ? "small" : "medium"} />
                            ) : (
                                <HomeIcon fontSize={isSmallScreen ? "small" : "medium"} />
                            )}
                        </IconButton>
                    </Tooltip>

                    {isSettingsPage ? (
                        <SettingsHeaderToolbar />
                    ) : customHeaderTitle ? (
                        <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
                            {customHeaderTitle}
                        </Box>
                    ) : (
                        <Typography 
                            variant="h6" 
                            component="div" 
                            sx={{ 
                                flexGrow: 1, 
                                fontSize: { xs: '1.05rem', sm: '1.25rem' },
                                fontWeight: 600,
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap' 
                            }}
                        >
                            {title || pageTitle || t('app.title')}
                        </Typography>
                    )}

                    {/* PWA Install Button when not in standalone mode */}
                    {!isStandalone && isInstallable && (
                        <Tooltip title={t('app.install_pwa', 'Install App')}>
                            <IconButton
                                color="primary"
                                onClick={installApp}
                                sx={{ ml: 0.5, p: 1.25 }}
                                aria-label={t('app.install_pwa', 'Install App')}
                            >
                                <InstallMobileIcon fontSize={isSmallScreen ? "small" : "medium"} />
                            </IconButton>
                        </Tooltip>
                    )}

                    {/* Settings Icon (Global) - Hide on game routes and when on settings page */}
                    {!hasSettings && !isSettingsPage && (
                        <Tooltip title={t('settings.title', 'Settings')}>
                            <IconButton
                                color="inherit"
                                onClick={() => navigate('/settings', { state: { from: location.pathname + location.search } })}
                                sx={{ ml: 0.5, p: 1.25 }}
                            >
                                <SettingsIcon fontSize={isSmallScreen ? "small" : "medium"} />
                            </IconButton>
                        </Tooltip>
                    )}

                    {/* Feedback Icon - always visible */}
                    <Tooltip title={t('settings.feedback_title', 'Feedback & Bug Report')}>
                        <IconButton
                            id="feedback-button"
                            color="inherit"
                            onClick={() => {
                                if (!hasGitHubPAT()) {
                                    navigate('/settings?tab=general&sub=feedback&missing_pat=1');
                                } else {
                                    window.dispatchEvent(new Event('feedback:open'));
                                }
                            }}
                            sx={{ ml: 0.5, p: 1.25 }}
                        >
                            <FeedbackIcon fontSize={isSmallScreen ? "small" : "medium"} />
                        </IconButton>
                    </Tooltip>

                    {/* Always Visible Actions (Custom actions like CastButton usually stay visible) */}
                    {customHeaderActions}

                    {/* Toolbar Items (Desktop) */}
                    {visibleInToolbar.map((item, index) => (
                        <Tooltip key={index} title={item.label}>
                            <span>
                                <IconButton
                                    color="inherit"
                                    onClick={item.action}
                                    disabled={item.disabled}
                                    sx={{ p: 1.25 }}
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
                                size="medium"
                                edge="end"
                                aria-label="menu"
                                aria-controls="menu-appbar"
                                aria-haspopup="true"
                                onClick={handleMenuOpen}
                                color="inherit"
                                sx={{ ml: 0.5, p: 1.25 }}
                            >
                                <MenuIcon fontSize={isSmallScreen ? "small" : "medium"} />
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
                                        sx={{ minHeight: 48, py: 1.5 }}
                                    >
                                        {item.icon && <Box component="span" sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>{item.icon}</Box>}
                                        {item.label}
                                    </MenuItem>
                                ))}
                            </Menu>
                        </div>
                    )}
                </Toolbar>
                {isSettingsPage && <SettingsHeaderSubNav />}
            </AppBar>
            <PWAInstallDialog open={showIOSGuide} onClose={() => setShowIOSGuide(false)} />
        </>
    );
};

