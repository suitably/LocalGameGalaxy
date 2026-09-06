import React, { useState } from 'react';
import {
    Box,
    Button,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Typography,
    Divider,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import MicIcon from '@mui/icons-material/Mic';
import DnsIcon from '@mui/icons-material/Dns';
import PersonIcon from '@mui/icons-material/Person';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import LanguageIcon from '@mui/icons-material/Language';
import FeedbackIcon from '@mui/icons-material/Feedback';
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { subPillSx } from '../settingsStyles';
import { resolveSettingsNav } from '../settingsNav';

const menuPaperSx = {
    '& .MuiPaper-root': {
        bgcolor: '#1c1f2e',
        backgroundImage: 'none',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2.5,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.55)',
        p: 0.5,
        minWidth: 210,
    },
    '& .MuiMenuItem-root': {
        borderRadius: 1.5,
        py: 0.8,
        px: 1.5,
        fontSize: '0.875rem',
        fontWeight: 500,
        color: 'rgba(255, 255, 255, 0.85)',
        gap: 1.25,
        '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.08)',
        },
        '&.Mui-selected': {
            bgcolor: 'rgba(144, 202, 249, 0.15)',
            color: '#90caf9',
            fontWeight: 600,
            '&:hover': {
                bgcolor: 'rgba(144, 202, 249, 0.22)',
            },
        },
    },
};

const mainMenuBtnSx = (isActive: boolean) => ({
    textTransform: 'none',
    fontWeight: isActive ? 700 : 500,
    fontSize: { xs: '0.8rem', sm: '0.875rem' },
    color: isActive ? '#90caf9' : 'rgba(255, 255, 255, 0.75)',
    bgcolor: isActive ? 'rgba(144, 202, 249, 0.14)' : 'transparent',
    border: isActive ? '1px solid rgba(144, 202, 249, 0.35)' : '1px solid transparent',
    borderRadius: 2,
    px: { xs: 1, sm: 1.5 },
    py: 0.5,
    minHeight: 34,
    transition: 'all 0.15s ease',
    '&:hover': {
        bgcolor: isActive ? 'rgba(144, 202, 249, 0.2)' : 'rgba(255, 255, 255, 0.07)',
        color: isActive ? '#90caf9' : 'rgba(255, 255, 255, 0.95)',
    },
});

export const SettingsHeaderToolbar: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const { activeTab, activeSub, isFromMelodiq } = resolveSettingsNav(
        searchParams,
        location.state
    );

    // Menu states
    const [melodiqAnchor, setMelodiqAnchor] = useState<null | HTMLElement>(null);
    const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);

    const updateNav = (tab: string, sub?: string, section?: string) => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('tab', tab);
        if (sub) {
            nextParams.set('sub', sub);
        } else {
            nextParams.delete('sub');
        }
        if (section) {
            nextParams.set('section', section);
        } else {
            nextParams.delete('section');
        }
        navigate(`/settings?${nextParams.toString()}`, { replace: true, state: location.state });
        handleCloseAll();
    };

    const handleCloseAll = () => {
        setMelodiqAnchor(null);
        setMobileMenuAnchor(null);
    };

    const getActiveLabel = () => {
        if (activeTab === 'notifications') return t('settings.notifications_tab', 'Benachrichtigungen');
        if (activeTab === 'melodiq') {
            if (activeSub === 'server') return `Melodiq › ${t('melodiq.server.tab', 'Companion Server')}`;
            if (activeSub === 'microphones') return `Melodiq › ${t('melodiq.settings.microphones', 'Mikrofone')}`;
            if (activeSub === 'profiles') return `Melodiq › ${t('melodiq.settings.profiles', 'Profile')}`;
            if (activeSub === 'gameplay') return `Melodiq › ${t('melodiq.settings.gameplay', 'Gameplay')}`;
            if (activeSub === 'playlists') return `Melodiq › ${t('melodiq.playlists', 'Playlists')}`;
            return 'Melodiq';
        }
        if (activeSub === 'language') return `Allgemein › ${t('settings.language_preferences', 'Sprache')}`;
        if (activeSub === 'feedback') return `Allgemein › ${t('settings.feedback_title', 'Feedback')}`;
        if (activeSub === 'github' || activeSub === 'pat') return `Allgemein › GitHub (PAT)`;
        return t('settings.general_tab', 'Allgemein');
    };

    const renderMelodiqDropdown = () => (
        <>
            <Button
                onClick={(e) => setMelodiqAnchor(e.currentTarget)}
                endIcon={<KeyboardArrowDownIcon />}
                startIcon={<MicIcon fontSize="small" />}
                sx={mainMenuBtnSx(activeTab === 'melodiq')}
            >
                {t('games.melodiq.title', 'Melodiq')}
            </Button>
            <Menu
                anchorEl={melodiqAnchor}
                open={Boolean(melodiqAnchor)}
                onClose={handleCloseAll}
                sx={menuPaperSx}
            >
                <MenuItem onClick={() => updateNav('melodiq', 'all')} selected={activeTab === 'melodiq' && (activeSub === 'all' || !activeSub)}>
                    <ListItemIcon><MicIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('common.all', 'Alle Einstellungen')} />
                </MenuItem>

                <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.08)' }} />

                <MenuItem onClick={() => updateNav('melodiq', 'server')} selected={activeTab === 'melodiq' && activeSub === 'server'}>
                    <ListItemIcon><DnsIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('melodiq.server.tab', 'Companion Server')} />
                </MenuItem>

                <MenuItem onClick={() => updateNav('melodiq', 'microphones')} selected={activeTab === 'melodiq' && activeSub === 'microphones'}>
                    <ListItemIcon><MicIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('melodiq.settings.microphones', 'Mikrofone')} />
                </MenuItem>
                <MenuItem onClick={() => updateNav('melodiq', 'profiles')} selected={activeTab === 'melodiq' && activeSub === 'profiles'}>
                    <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('melodiq.settings.profiles', 'Spieler-Profile')} />
                </MenuItem>
                <MenuItem onClick={() => updateNav('melodiq', 'gameplay')} selected={activeTab === 'melodiq' && activeSub === 'gameplay'}>
                    <ListItemIcon><SportsEsportsIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('melodiq.settings.gameplay', 'Gameplay')} />
                </MenuItem>
                <MenuItem onClick={() => updateNav('melodiq', 'playlists')} selected={activeTab === 'melodiq' && activeSub === 'playlists'}>
                    <ListItemIcon><QueueMusicIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('melodiq.playlists', 'Playlists')} />
                </MenuItem>
            </Menu>
        </>
    );

    const renderGeneralButton = () => (
        <Button
            onClick={() => updateNav('general', 'all')}
            startIcon={<SettingsIcon fontSize="small" />}
            sx={mainMenuBtnSx(activeTab === 'general')}
        >
            {t('settings.general_tab', 'Allgemein')}
        </Button>
    );

    const renderNotificationsButton = () => (
        <Button
            onClick={() => updateNav('notifications')}
            startIcon={<NotificationsActiveIcon fontSize="small" />}
            sx={mainMenuBtnSx(activeTab === 'notifications')}
        >
            {t('settings.notifications_tab', 'Benachrichtigungen')}
        </Button>
    );

    const renderMobileMenuItems = () => {
        const generalMenuItems = (
            <React.Fragment key="general-group">
                <MenuItem disabled sx={{ opacity: '0.6 !important', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', py: 0.5 }}>
                    {t('settings.general_tab', 'Allgemein')}
                </MenuItem>
                <MenuItem onClick={() => updateNav('general', 'all')} selected={activeTab === 'general' && (activeSub === 'all' || !activeSub)}>
                    <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('common.all', 'Alle')} />
                </MenuItem>
                <MenuItem onClick={() => updateNav('general', 'language')} selected={activeTab === 'general' && activeSub === 'language'}>
                    <ListItemIcon><LanguageIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('settings.language_preferences', 'Sprache')} />
                </MenuItem>
                <MenuItem onClick={() => updateNav('general', 'feedback')} selected={activeTab === 'general' && activeSub === 'feedback'}>
                    <ListItemIcon><FeedbackIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('settings.feedback_title', 'Feedback')} />
                </MenuItem>
                <MenuItem onClick={() => updateNav('general', 'github')} selected={activeTab === 'general' && (activeSub === 'github' || activeSub === 'pat')}>
                    <ListItemIcon><VpnKeyRoundedIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="GitHub (PAT)" />
                </MenuItem>
            </React.Fragment>
        );

        const notificationsMenuItems = (
            <React.Fragment key="notifications-group">
                <MenuItem disabled sx={{ opacity: '0.6 !important', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', py: 0.5 }}>
                    {t('settings.notifications_tab', 'Benachrichtigungen')}
                </MenuItem>
                <MenuItem onClick={() => updateNav('notifications')} selected={activeTab === 'notifications'}>
                    <ListItemIcon><NotificationsActiveIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('settings.notifications_tab', 'Push & ntfy')} />
                </MenuItem>
            </React.Fragment>
        );

        const melodiqMenuItems = (
            <React.Fragment key="melodiq-group">
                <MenuItem disabled sx={{ opacity: '0.6 !important', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', py: 0.5 }}>
                    {t('games.melodiq.title', 'Melodiq')}
                </MenuItem>
                <MenuItem onClick={() => updateNav('melodiq', 'all')} selected={activeTab === 'melodiq' && (activeSub === 'all' || !activeSub)}>
                    <ListItemIcon><MicIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('common.all', 'Alle Einstellungen')} />
                </MenuItem>
                <MenuItem onClick={() => updateNav('melodiq', 'server')} selected={activeTab === 'melodiq' && activeSub === 'server'}>
                    <ListItemIcon><DnsIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('melodiq.server.tab', 'Companion Server')} />
                </MenuItem>
                <MenuItem onClick={() => updateNav('melodiq', 'microphones')} selected={activeTab === 'melodiq' && activeSub === 'microphones'}>
                    <ListItemIcon><MicIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('melodiq.settings.microphones', 'Mikrofone')} />
                </MenuItem>
                <MenuItem onClick={() => updateNav('melodiq', 'profiles')} selected={activeTab === 'melodiq' && activeSub === 'profiles'}>
                    <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('melodiq.settings.profiles', 'Spieler-Profile')} />
                </MenuItem>
                <MenuItem onClick={() => updateNav('melodiq', 'gameplay')} selected={activeTab === 'melodiq' && activeSub === 'gameplay'}>
                    <ListItemIcon><SportsEsportsIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('melodiq.settings.gameplay', 'Gameplay')} />
                </MenuItem>
                <MenuItem onClick={() => updateNav('melodiq', 'playlists')} selected={activeTab === 'melodiq' && activeSub === 'playlists'}>
                    <ListItemIcon><QueueMusicIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t('melodiq.playlists', 'Playlists')} />
                </MenuItem>
            </React.Fragment>
        );

        // If coming from Melodiq, show Melodiq first; otherwise show Allgemein first
        if (isFromMelodiq) {
            return [
                melodiqMenuItems,
                <Divider key="d1" sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.08)' }} />,
                generalMenuItems,
                <Divider key="d2" sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.08)' }} />,
                notificationsMenuItems,
            ];
        }

        return [
            generalMenuItems,
            <Divider key="d1" sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.08)' }} />,
            notificationsMenuItems,
            <Divider key="d2" sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.08)' }} />,
            melodiqMenuItems,
        ];
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, minWidth: 0, gap: { xs: 0.5, sm: 1.5 } }}>
            {/* Title / Brand */}
            <Typography
                variant="subtitle1"
                sx={{
                    fontWeight: 700,
                    fontSize: { xs: '0.95rem', sm: '1.1rem' },
                    color: 'rgba(255,255,255,0.95)',
                    whiteSpace: 'nowrap',
                    display: { xs: 'none', md: 'block' }
                }}
            >
                {t('settings.title', 'Einstellungen')}
            </Typography>

            <Divider
                orientation="vertical"
                flexItem
                sx={{
                    my: 1,
                    borderColor: 'rgba(255,255,255,0.12)',
                    display: { xs: 'none', md: 'block' }
                }}
            />

            {/* Mobile View: Compact Dropdown */}
            {isMobile ? (
                <>
                    <Button
                        size="small"
                        onClick={(e) => setMobileMenuAnchor(e.currentTarget)}
                        endIcon={<KeyboardArrowDownIcon />}
                        sx={{
                            ...mainMenuBtnSx(true),
                            maxWidth: '240px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {getActiveLabel()}
                    </Button>
                    <Menu
                        anchorEl={mobileMenuAnchor}
                        open={Boolean(mobileMenuAnchor)}
                        onClose={handleCloseAll}
                        sx={menuPaperSx}
                    >
                        {renderMobileMenuItems()}
                    </Menu>
                </>
            ) : (
                /* Desktop / Tablet View: Classic Header Menu Bar with dynamic order */
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isFromMelodiq ? (
                        <>
                            {renderMelodiqDropdown()}
                            {renderGeneralButton()}
                            {renderNotificationsButton()}
                        </>
                    ) : (
                        <>
                            {renderGeneralButton()}
                            {renderNotificationsButton()}
                            {renderMelodiqDropdown()}
                        </>
                    )}
                </Box>
            )}
        </Box>
    );
};

export const SettingsHeaderSubNav: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const { activeTab, activeSub } = resolveSettingsNav(
        searchParams,
        location.state
    );

    const updateNav = (tab: string, sub?: string, section?: string) => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('tab', tab);
        if (sub) {
            nextParams.set('sub', sub);
        } else {
            nextParams.delete('sub');
        }
        if (section) {
            nextParams.set('section', section);
        } else {
            nextParams.delete('section');
        }
        navigate(`/settings?${nextParams.toString()}`, { replace: true, state: location.state });
    };

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                px: { xs: 1.5, sm: 2.5 },
                py: 0.75,
                bgcolor: 'rgba(18, 20, 28, 0.96)',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                gap: 1,
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
            }}
        >
            {/* Level 2 Sub-Nav: Allgemein */}
            {activeTab === 'general' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 'max-content' }}>
                    <Button
                        size="small"
                        onClick={() => updateNav('general', 'all')}
                        sx={subPillSx(activeSub === 'all' || !activeSub)}
                    >
                        {t('common.all', 'Alle')}
                    </Button>
                    <Button
                        size="small"
                        startIcon={<LanguageIcon fontSize="small" />}
                        onClick={() => updateNav('general', 'language')}
                        sx={subPillSx(activeSub === 'language')}
                    >
                        {t('settings.language_preferences', 'Sprache')}
                    </Button>
                    <Button
                        size="small"
                        startIcon={<FeedbackIcon fontSize="small" />}
                        onClick={() => updateNav('general', 'feedback')}
                        sx={subPillSx(activeSub === 'feedback')}
                    >
                        {t('settings.feedback_title', 'Feedback')}
                    </Button>
                    <Button
                        size="small"
                        startIcon={<VpnKeyRoundedIcon fontSize="small" />}
                        onClick={() => updateNav('general', 'github')}
                        sx={subPillSx(activeSub === 'github' || activeSub === 'pat')}
                    >
                        GitHub (PAT)
                    </Button>
                </Box>
            )}

            {/* Level 2 Sub-Nav: Melodiq */}
            {activeTab === 'melodiq' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 'max-content' }}>
                    <Button
                        size="small"
                        onClick={() => updateNav('melodiq', 'all')}
                        sx={subPillSx(activeSub === 'all' || !activeSub)}
                    >
                        {t('common.all', 'Alle')}
                    </Button>
                    <Button
                        size="small"
                        startIcon={<DnsIcon fontSize="small" />}
                        onClick={() => updateNav('melodiq', 'server')}
                        sx={subPillSx(activeSub === 'server')}
                    >
                        {t('melodiq.server.tab', 'Companion Server')}
                    </Button>
                    <Button
                        size="small"
                        startIcon={<MicIcon fontSize="small" />}
                        onClick={() => updateNav('melodiq', 'microphones')}
                        sx={subPillSx(activeSub === 'microphones')}
                    >
                        {t('melodiq.settings.microphones', 'Mikrofone')}
                    </Button>
                    <Button
                        size="small"
                        startIcon={<PersonIcon fontSize="small" />}
                        onClick={() => updateNav('melodiq', 'profiles')}
                        sx={subPillSx(activeSub === 'profiles')}
                    >
                        {t('melodiq.settings.profiles', 'Spieler-Profile')}
                    </Button>
                    <Button
                        size="small"
                        startIcon={<SportsEsportsIcon fontSize="small" />}
                        onClick={() => updateNav('melodiq', 'gameplay')}
                        sx={subPillSx(activeSub === 'gameplay')}
                    >
                        {t('melodiq.settings.gameplay', 'Gameplay')}
                    </Button>
                    <Button
                        size="small"
                        startIcon={<QueueMusicIcon fontSize="small" />}
                        onClick={() => updateNav('melodiq', 'playlists')}
                        sx={subPillSx(activeSub === 'playlists')}
                    >
                        {t('melodiq.playlists', 'Playlists')}
                    </Button>
                </Box>
            )}

            {/* Level 2 Sub-Nav: Notifications */}
            {activeTab === 'notifications' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.65)', fontWeight: 500 }}>
                        {t('settings.notifications_relay_desc', 'Web Push & ntfy.sh Topic Sync für globale Multiplayer-Benachrichtigungen')}
                    </Typography>
                </Box>
            )}
        </Box>
    );
};
