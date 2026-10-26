import React from 'react';
import { List, ListItemButton, ListItemIcon, ListItemText, ListSubheader } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { isEntryActive, type SettingsNavEntry, type SettingsNavModel } from './settingsNavModel';
import type { SettingsTarget } from './settingsRoutes';

interface SettingsRailProps {
  nav: SettingsNavModel;
  current: SettingsTarget;
  onSelect: (target: SettingsTarget) => void;
}

/** Master list of the settings page: app groups, games, about. */
export const SettingsRail: React.FC<SettingsRailProps> = ({ nav, current, onSelect }) => {
  const { t } = useTranslation();
  const renderEntry = (entry: SettingsNavEntry) => (
    <ListItemButton
      key={entry.id}
      selected={isEntryActive(entry, current)}
      onClick={() => onSelect(entry.target)}
      sx={{ borderRadius: 3, mb: 0.5, minHeight: 48 }}
    >
      <ListItemIcon sx={{ minWidth: 40, color: 'primary.main' }}>{entry.icon}</ListItemIcon>
      <ListItemText primary={entry.label} />
    </ListItemButton>
  );

  return (
    <List component="nav" aria-label={t('settings.title')} sx={{ p: 0 }}>
      {nav.top.map(renderEntry)}
      {nav.games.length > 0 && (
        <ListSubheader disableSticky sx={{ bgcolor: 'transparent', lineHeight: '36px', mt: 1 }}>
          {t('settings.nav.games')}
        </ListSubheader>
      )}
      {nav.games.map(renderEntry)}
      {nav.bottom.map(renderEntry)}
    </List>
  );
};
