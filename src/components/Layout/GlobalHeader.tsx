import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/HomeRounded';
import SettingsIcon from '@mui/icons-material/SettingsRounded';
import FeedbackIcon from '@mui/icons-material/FeedbackRounded';
import InstallMobileIcon from '@mui/icons-material/InstallMobileRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useTranslation } from 'react-i18next';
import { useHeaderLayout } from '../../context/HeaderLayoutContext';
import { useTitle } from '../../context/TitleContext';
import { useGameSettings } from '../../context/GameSettingsContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { gameRegistry } from '../../lib/gameRegistry';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { HeaderOverflowMenu } from './HeaderOverflowMenu';
import { useHomeNavigation } from './useHomeNavigation';
import { PWAInstallDialog } from '../pwa/PWAInstallDialog';
import { hasGitHubPAT } from '../../lib/github';
import { settingsPath } from '../../features/settings/settingsRoutes';

export const GlobalHeader: React.FC = () => {
  const { t } = useTranslation();
  const { customHeaderTitle, menuItems, homeAction, customHeaderActions, hideHome } =
    useHeaderLayout();
  const { title } = useTitle();
  const { openGameSettings } = useGameSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('md'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const activeGame = gameRegistry.findGameByPath(location.pathname);
  const isSettingsPage = location.pathname.startsWith('/settings');
  const { isStandalone, isInstallable, installApp, showIOSGuide, setShowIOSGuide } =
    usePWAInstall();

  const handleHomeClick = useHomeNavigation(homeAction, isSettingsPage);

  // Responsive Logic:
  // Large Screen: Show ALL items in toolbar.
  // Small Screen: Items with showAlways go into toolbar; the rest go into overflow burger menu.
  const visibleInToolbar = isLargeScreen ? menuItems : menuItems.filter((item) => item.showAlways);
  const overflowItems = isLargeScreen ? [] : menuItems.filter((item) => !item.showAlways);

  return (
    <>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ alignItems: 'center', minHeight: { xs: 48, sm: 56 }, px: { xs: 1, sm: 2 } }}>
          {(!hideHome || homeAction || isSettingsPage) && (
            <Tooltip
              title={
                homeAction || isSettingsPage ? t('common.back', 'Zurück') : t('common.home', 'Home')
              }
            >
              <IconButton
                size="medium"
                edge="start"
                color="inherit"
                aria-label={homeAction || isSettingsPage ? t('common.back', 'Zurück') : 'home'}
                sx={{ mr: { xs: 0.5, sm: 1.5 }, p: { xs: 0.75, sm: 1.25 } }}
                onClick={handleHomeClick}
              >
                {homeAction || isSettingsPage ? (
                  <ArrowBackRoundedIcon fontSize={isSmallScreen ? 'small' : 'medium'} />
                ) : (
                  <HomeIcon fontSize={isSmallScreen ? 'small' : 'medium'} />
                )}
              </IconButton>
            </Tooltip>
          )}

          {customHeaderTitle && !isSettingsPage ? (
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
                whiteSpace: 'nowrap',
                ml: hideHome && !homeAction && !isSettingsPage ? { xs: 1, sm: 1.5 } : 0,
              }}
            >
              {title || t('app.title')}
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
                <InstallMobileIcon fontSize={isSmallScreen ? 'small' : 'medium'} />
              </IconButton>
            </Tooltip>
          )}

          {/* One settings gear: game sheet on games with settings, app settings elsewhere; hidden on /settings */}
          {!isSettingsPage && (
            <Tooltip title={t('settings.title', 'Settings')}>
              <IconButton
                color="inherit"
                aria-label={t('settings.title', 'Settings')}
                onClick={() =>
                  activeGame?.settings
                    ? openGameSettings()
                    : navigate(settingsPath({ kind: 'list' }), {
                        state: { from: location.pathname + location.search },
                      })
                }
                sx={{ ml: 0.5, p: 1.25 }}
              >
                <SettingsIcon fontSize={isSmallScreen ? 'small' : 'medium'} />
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
                  navigate(
                    settingsPath({ kind: 'app', section: 'integrations', highlight: 'pat' }),
                  );
                } else {
                  window.dispatchEvent(new Event('feedback:open'));
                }
              }}
              sx={{ ml: 0.5, p: 1.25 }}
            >
              <FeedbackIcon fontSize={isSmallScreen ? 'small' : 'medium'} />
            </IconButton>
          </Tooltip>

          {/* Always Visible Actions (Custom actions like CastButton usually stay visible) */}
          {customHeaderActions}

          {/* Toolbar Items (Desktop) */}
          {visibleInToolbar.map((item, index) => (
            <Tooltip key={index} title={item.label} describeChild>
              <span>
                <IconButton
                  aria-label={item.label}
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

          <HeaderOverflowMenu items={overflowItems} iconSize={isSmallScreen ? 'small' : 'medium'} />
        </Toolbar>
      </AppBar>
      <PWAInstallDialog open={showIOSGuide} onClose={() => setShowIOSGuide(false)} />
    </>
  );
};
