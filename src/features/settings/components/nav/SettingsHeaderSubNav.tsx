import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useLocation } from 'react-router-dom';
import { subPillSx } from '../../settingsStyles';
import { resolveSettingsNav } from '../../settingsNav';
import { NAV_TABS, isSubActive } from './settingsNavModel';
import { useSettingsNavUpdate } from './useSettingsNavUpdate';

/** Second navigation level (pills) below the header while on the settings page. */
export const SettingsHeaderSubNav: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const update = useSettingsNavUpdate();
  const { activeTab, activeSub } = resolveSettingsNav(searchParams, location.state);
  const group = NAV_TABS[activeTab];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: { xs: 1.5, sm: 2.5 },
        py: 0.75,
        bgcolor: 'background.default',
        borderTop: 1,
        borderColor: 'divider',
        gap: 1,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }}
    >
      {group.subs.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 'max-content' }}>
          {group.subs.map((entry) => (
            <Button
              key={entry.sub}
              size="small"
              startIcon={entry.sub === 'all' ? undefined : entry.icon}
              onClick={() => update(activeTab, entry.sub, entry.section)}
              sx={subPillSx(isSubActive(entry, activeSub))}
            >
              {entry.label(t)}
            </Button>
          ))}
        </Box>
      )}

      {activeTab === 'notifications' && (
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          {t(
            'settings.notifications_relay_desc',
            'Web Push & ntfy.sh topic sync for global multiplayer notifications',
          )}
        </Typography>
      )}
    </Box>
  );
};
