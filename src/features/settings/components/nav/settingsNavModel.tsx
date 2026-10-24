import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import MicIcon from '@mui/icons-material/Mic';
import DnsIcon from '@mui/icons-material/Dns';
import HubIcon from '@mui/icons-material/Hub';
import ExtensionIcon from '@mui/icons-material/Extension';
import PersonIcon from '@mui/icons-material/Person';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import LanguageIcon from '@mui/icons-material/Language';
import FeedbackIcon from '@mui/icons-material/Feedback';
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PianoIcon from '@mui/icons-material/Piano';
import type { SettingsTabType } from '../../settingsNav';

type Label = (t: TFunction) => string;

export interface NavSub {
  sub: string;
  /** Anchor section passed as `?section=` (scrolls the settings page). */
  section?: string;
  icon?: ReactNode;
  label: Label;
  /** Other `sub` values that also mark this entry as active. */
  alsoActiveFor?: string[];
  /** Hidden from the compact (mobile) menu. */
  desktopOnly?: boolean;
}

export interface NavTab {
  tab: SettingsTabType;
  icon: ReactNode;
  /** Group heading in menus and prefix of the compact label. */
  title: Label;
  /** Text of the toolbar button. */
  button: Label;
  /** Second-level entries; empty for tabs that are a single page. */
  subs: NavSub[];
  /** Renders as a drop-down with its sub entries instead of a plain button (desktop). */
  dropdown?: boolean;
  /** Compact label when the tab is active, replacing "<title> › <sub>". */
  activeLabel?: Label;
}

const icon = (Icon: typeof SettingsIcon) => <Icon fontSize="small" />;
const all: Label = (t) => t('common.all', 'All');

export const NAV_TABS: Record<SettingsTabType, NavTab> = {
  general: {
    tab: 'general',
    icon: icon(SettingsIcon),
    title: (t) => t('settings.general_tab', 'General'),
    button: (t) => t('settings.general_tab', 'General'),
    subs: [
      { sub: 'all', icon: icon(SettingsIcon), label: all },
      {
        sub: 'language',
        icon: icon(LanguageIcon),
        label: (t) => t('settings.language_preferences', 'Language Preferences'),
      },
      {
        sub: 'feedback',
        icon: icon(FeedbackIcon),
        label: (t) => t('settings.feedback_title', 'Feedback & Bug Report'),
      },
      {
        sub: 'github',
        alsoActiveFor: ['pat'],
        icon: icon(VpnKeyRoundedIcon),
        label: () => 'GitHub (PAT)',
      },
    ],
  },
  'melodiq-notes': {
    tab: 'melodiq-notes',
    icon: icon(PianoIcon),
    title: () => 'Melodiq Notes',
    button: (t) => t('settings.melodiq_notes_tab', 'Instrument Sounds'),
    subs: [],
    activeLabel: (t) => `Melodiq Notes › ${t('settings.melodiq_notes_tab', 'Instrument Sounds')}`,
  },
  server: {
    tab: 'server',
    icon: icon(DnsIcon),
    title: (t) => t('settings.server_tab', 'Server'),
    button: (t) => t('settings.server_tab', 'Server'),
    subs: [
      { sub: 'all', icon: icon(DnsIcon), label: all },
      {
        sub: 'signaling',
        section: 'signaling',
        icon: icon(HubIcon),
        label: () => 'WebRTC Signaling',
      },
      {
        sub: 'companion',
        section: 'companion',
        icon: icon(ExtensionIcon),
        label: () => 'Companion Plugins',
      },
      {
        sub: 'compose',
        section: 'compose',
        icon: icon(ContentCopyIcon),
        label: (t) => t('settings.compose_generator', 'Compose'),
        desktopOnly: true,
      },
    ],
  },
  notifications: {
    tab: 'notifications',
    icon: icon(NotificationsActiveIcon),
    title: (t) => t('settings.notifications_tab', 'Notifications'),
    button: (t) => t('settings.notifications_tab', 'Notifications'),
    subs: [],
  },
  melodiq: {
    tab: 'melodiq',
    icon: icon(MicIcon),
    title: (t) => t('games.melodiq.title', 'Melodiq'),
    button: (t) => t('games.melodiq.title', 'Melodiq'),
    dropdown: true,
    subs: [
      { sub: 'all', icon: icon(MicIcon), label: all },
      {
        sub: 'microphones',
        icon: icon(MicIcon),
        label: (t) => t('settings.melodiq_microphones', 'Microphones'),
      },
      {
        sub: 'profiles',
        icon: icon(PersonIcon),
        label: (t) => t('settings.melodiq_profiles', 'Player Profiles'),
      },
      {
        sub: 'gameplay',
        icon: icon(SportsEsportsIcon),
        label: (t) => t('settings.melodiq_gameplay', 'Gameplay'),
      },
      {
        sub: 'playlists',
        icon: icon(QueueMusicIcon),
        label: (t) => t('melodiq.playlists', 'Playlists'),
      },
    ],
  },
};

/** Tab order of the desktop toolbar; the Melodiq drop-down leads when coming from Melodiq. */
export function desktopTabOrder(isFromMelodiq: boolean): SettingsTabType[] {
  return isFromMelodiq
    ? ['melodiq', 'general', 'melodiq-notes', 'server', 'notifications']
    : ['general', 'melodiq-notes', 'server', 'notifications', 'melodiq'];
}

/** Group order of the compact menu. */
export function mobileTabOrder(isFromMelodiq: boolean): SettingsTabType[] {
  return isFromMelodiq
    ? ['melodiq', 'general', 'server', 'notifications', 'melodiq-notes']
    : ['general', 'melodiq-notes', 'server', 'notifications', 'melodiq'];
}

/** Whether a sub entry is the active one (`all` also matches an empty sub). */
export function isSubActive(entry: NavSub, activeSub: string): boolean {
  if (entry.sub === 'all') return activeSub === 'all' || !activeSub;
  return entry.sub === activeSub || Boolean(entry.alsoActiveFor?.includes(activeSub));
}

/** Compact label of the current location, e.g. "Server › WebRTC Signaling". */
export function activeNavLabel(
  t: TFunction,
  activeTab: SettingsTabType,
  activeSub: string,
): string {
  const group = NAV_TABS[activeTab];
  if (group.activeLabel) return group.activeLabel(t);
  const sub = group.subs.find((s) => s.sub !== 'all' && isSubActive(s, activeSub));
  return sub ? `${group.title(t)} › ${sub.label(t)}` : group.title(t);
}
