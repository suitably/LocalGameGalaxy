import React from 'react';
import { Divider, ListItemIcon, ListItemText, MenuItem } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { SettingsTabType } from '../../settingsNav';
import { NAV_TABS, isSubActive } from './settingsNavModel';
import { menuGroupHeaderSx } from './settingsNavStyles';

interface NavNavigate {
  (tab: string, sub?: string, section?: string): void;
}

interface TabMenuItemsProps {
  tab: SettingsTabType;
  activeTab: SettingsTabType;
  activeSub: string;
  navigate: NavNavigate;
  /** Compact menu: skip desktop-only entries and show a group heading. */
  compact?: boolean;
}

/** Menu entries of one settings tab (sub entries, or a single entry for one-page tabs). */
export const TabMenuItems: React.FC<TabMenuItemsProps> = ({
  tab,
  activeTab,
  activeSub,
  navigate,
  compact,
}) => {
  const { t } = useTranslation();
  const group = NAV_TABS[tab];
  const isActiveTab = activeTab === tab;
  const subs = group.subs.filter((s) => !compact || !s.desktopOnly);

  return (
    <>
      {compact && (
        <MenuItem disabled sx={menuGroupHeaderSx}>
          {group.title(t)}
        </MenuItem>
      )}
      {subs.length === 0 && (
        <MenuItem onClick={() => navigate(tab)} selected={isActiveTab}>
          <ListItemIcon>{group.icon}</ListItemIcon>
          <ListItemText primary={group.button(t)} />
        </MenuItem>
      )}
      {subs.map((entry, index) => (
        <React.Fragment key={entry.sub}>
          {!compact && index === 1 && <Divider sx={{ my: 0.5 }} />}
          <MenuItem
            onClick={() => navigate(tab, entry.sub, entry.section)}
            selected={isActiveTab && isSubActive(entry, activeSub)}
          >
            <ListItemIcon>{entry.icon}</ListItemIcon>
            <ListItemText primary={entry.label(t)} />
          </MenuItem>
        </React.Fragment>
      ))}
    </>
  );
};
