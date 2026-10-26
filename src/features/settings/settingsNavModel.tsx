import React from 'react';
import { useTranslation } from 'react-i18next';
import SettingsIcon from '@mui/icons-material/SettingsRounded';
import MicIcon from '@mui/icons-material/MicRounded';
import DnsIcon from '@mui/icons-material/DnsRounded';
import NotificationsIcon from '@mui/icons-material/NotificationsActiveRounded';
import GitHubIcon from '@mui/icons-material/GitHub';
import InfoIcon from '@mui/icons-material/InfoRounded';
import { gameRegistry } from '../../lib/gameRegistry';
import type { AppSettingsSection, SettingsTarget } from './settingsRoutes';

export interface SettingsNavEntry {
  id: string;
  label: string;
  icon: React.ReactNode;
  target: SettingsTarget;
}

const APP_ICONS: Record<AppSettingsSection, React.ReactNode> = {
  general: <SettingsIcon />,
  audio: <MicIcon />,
  connectivity: <DnsIcon />,
  notifications: <NotificationsIcon />,
  integrations: <GitHubIcon />,
  about: <InfoIcon />,
};

export interface SettingsNavModel {
  top: SettingsNavEntry[];
  games: SettingsNavEntry[];
  bottom: SettingsNavEntry[];
}

/** Rail entries: app groups, one entry per game with settings (hub order), then About. */
export function useSettingsNav(): SettingsNavModel {
  const { t } = useTranslation();
  const app = (section: AppSettingsSection): SettingsNavEntry => ({
    id: section,
    label: t(`settings.nav.${section}`),
    icon: APP_ICONS[section],
    target: { kind: 'app', section },
  });
  const games = gameRegistry
    .getGames()
    .filter((g) => g.settings?.sections.length)
    .map((g): SettingsNavEntry => ({
      id: `game-${g.id}`,
      label: t(g.titleKey),
      icon: React.isValidElement<{ sx?: object }>(g.icon)
        ? React.cloneElement(g.icon, { sx: { fontSize: 24, mb: 0 } })
        : g.icon,
      target: { kind: 'game', gameId: g.id },
    }));
  return {
    top: (['general', 'audio', 'connectivity', 'notifications', 'integrations'] as const).map(app),
    games,
    bottom: [app('about')],
  };
}

/** True when `entry` is the page the current target shows. */
export function isEntryActive(entry: SettingsNavEntry, current: SettingsTarget): boolean {
  const t = entry.target;
  if (t.kind === 'app') return current.kind === 'app' && current.section === t.section;
  return t.kind === 'game' && current.kind === 'game' && current.gameId === t.gameId;
}
