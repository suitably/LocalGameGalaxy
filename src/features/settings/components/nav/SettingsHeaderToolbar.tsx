import React, { useState } from 'react';
import { Box, Button, Divider, Menu, Typography, useMediaQuery, useTheme } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useLocation } from 'react-router-dom';
import { resolveSettingsNav, type SettingsTabType } from '../../settingsNav';
import { TabMenuItems } from './SettingsNavMenuItems';
import { NAV_TABS, activeNavLabel, desktopTabOrder, mobileTabOrder } from './settingsNavModel';
import { mainMenuBtnSx, menuPaperSx } from './settingsNavStyles';
import { useSettingsNavUpdate } from './useSettingsNavUpdate';

/** Settings navigation inside the global header: tab buttons, or one compact menu on phones. */
export const SettingsHeaderToolbar: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const update = useSettingsNavUpdate();
  const { activeTab, activeSub, isFromMelodiq } = resolveSettingsNav(searchParams, location.state);

  const [dropdownAnchor, setDropdownAnchor] = useState<null | HTMLElement>(null);
  const [mobileAnchor, setMobileAnchor] = useState<null | HTMLElement>(null);

  const navigate = (tab: string, sub?: string, section?: string) => {
    update(tab, sub, section);
    setDropdownAnchor(null);
    setMobileAnchor(null);
  };

  const renderTab = (tab: SettingsTabType) => {
    const group = NAV_TABS[tab];
    const isActive = activeTab === tab;
    if (group.dropdown) {
      return (
        <React.Fragment key={tab}>
          <Button
            onClick={(e) => setDropdownAnchor(e.currentTarget)}
            endIcon={<KeyboardArrowDownIcon />}
            startIcon={group.icon}
            sx={mainMenuBtnSx(isActive)}
          >
            {group.button(t)}
          </Button>
          <Menu
            anchorEl={dropdownAnchor}
            open={Boolean(dropdownAnchor)}
            onClose={() => setDropdownAnchor(null)}
            sx={menuPaperSx}
          >
            <TabMenuItems
              tab={tab}
              activeTab={activeTab}
              activeSub={activeSub}
              navigate={navigate}
            />
          </Menu>
        </React.Fragment>
      );
    }
    return (
      <Button
        key={tab}
        onClick={() => (group.subs.length ? navigate(tab, 'all') : navigate(tab))}
        startIcon={group.icon}
        sx={mainMenuBtnSx(isActive)}
      >
        {group.button(t)}
      </Button>
    );
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexGrow: 1,
        minWidth: 0,
        gap: { xs: 0.5, sm: 1.5 },
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 700,
          fontSize: { xs: '0.95rem', sm: '1.1rem' },
          whiteSpace: 'nowrap',
          display: { xs: 'none', md: 'block' },
        }}
      >
        {t('settings.title', 'Settings')}
      </Typography>

      <Divider
        orientation="vertical"
        flexItem
        sx={{ my: 1, display: { xs: 'none', md: 'block' } }}
      />

      {isMobile ? (
        <>
          <Button
            size="small"
            onClick={(e) => setMobileAnchor(e.currentTarget)}
            endIcon={<KeyboardArrowDownIcon />}
            sx={{
              ...mainMenuBtnSx(true),
              maxWidth: '240px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {activeNavLabel(t, activeTab, activeSub)}
          </Button>
          <Menu
            anchorEl={mobileAnchor}
            open={Boolean(mobileAnchor)}
            onClose={() => setMobileAnchor(null)}
            sx={menuPaperSx}
          >
            {mobileTabOrder(isFromMelodiq).flatMap((tab, index) => [
              index > 0 && <Divider key={`divider-${tab}`} sx={{ my: 0.5 }} />,
              <TabMenuItems
                key={tab}
                tab={tab}
                activeTab={activeTab}
                activeSub={activeSub}
                navigate={navigate}
                compact
              />,
            ])}
          </Menu>
        </>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {desktopTabOrder(isFromMelodiq).map(renderTab)}
        </Box>
      )}
    </Box>
  );
};
