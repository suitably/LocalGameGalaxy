import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TrackerItem } from '../../lib/webrtc';
import { ServerUrlList, type ServerUrlItem } from './ServerUrlList';

export interface DeviceTrackerSettingsProps {
  allTrackers?: TrackerItem[];
  activeTrackerUrls?: string[];
  trackerUrls?: string[];
  toggleTrackerActive?: (url: string, enabled?: boolean) => void;
  addTrackerUrl: (url: string) => void;
  removeTrackerUrl: (url: string) => void;
  restoreDefaultTrackers: () => void;
}

export const DeviceTrackerSettings: React.FC<DeviceTrackerSettingsProps> = ({
  allTrackers: contextAllTrackers,
  activeTrackerUrls = [],
  trackerUrls = [],
  toggleTrackerActive,
  addTrackerUrl,
  removeTrackerUrl,
  restoreDefaultTrackers,
}) => {
  const { t } = useTranslation();

  const items: ServerUrlItem[] = useMemo(() => {
    const trackers: TrackerItem[] =
      contextAllTrackers && contextAllTrackers.length > 0
        ? contextAllTrackers
        : Array.from(new Set([...activeTrackerUrls, ...trackerUrls])).map((url) => ({
            url,
            type: trackerUrls.includes(url) ? ('custom' as const) : ('public' as const),
            enabled: activeTrackerUrls.includes(url),
          }));
    return trackers.map((item) => {
      if (item.type === 'backend') {
        return {
          ...item,
          chipLabel: t('signaling.type_backend', 'Self-Hosted'),
          chipColor: 'success' as const,
          switchColor: 'success' as const,
          removable: false,
        };
      }
      if (item.type === 'public') {
        return {
          ...item,
          chipLabel: t('signaling.type_public', 'Free / Public'),
          chipColor: 'info' as const,
          switchColor: 'primary' as const,
          removable: false,
        };
      }
      return {
        ...item,
        chipLabel: t('signaling.type_custom', 'Custom'),
        chipColor: 'secondary' as const,
        switchColor: 'secondary' as const,
        removable: true,
      };
    });
  }, [contextAllTrackers, activeTrackerUrls, trackerUrls, t]);

  return (
    <ServerUrlList
      items={items}
      showEmptyWarning={activeTrackerUrls.length === 0}
      labels={{
        title: t('signaling.title', 'Signaling Servers (Trackers)'),
        restoreDefaults: t('signaling.restore_defaults', 'Restore Defaults'),
        enable: t('signaling.toggle_enable', 'Enable server'),
        disable: t('signaling.toggle_disable', 'Disable server'),
        remove: t('signaling.remove_tooltip', 'Remove tracker'),
        placeholder: t('signaling.placeholder', 'wss://tracker.example.com'),
        add: t('signaling.add_button', 'Add'),
        emptyWarning: t(
          'signaling.no_trackers_warning',
          'No active signaling servers configured. Connection to mobile devices will not be possible. Please enable at least one server.',
        ),
      }}
      onToggle={(item) => {
        if (toggleTrackerActive) toggleTrackerActive(item.url, !item.enabled);
        else if (item.enabled) removeTrackerUrl(item.url);
        else addTrackerUrl(item.url);
      }}
      onRemove={removeTrackerUrl}
      onAdd={(url) => {
        addTrackerUrl(url);
        return null;
      }}
      onRestoreDefaults={restoreDefaultTrackers}
    />
  );
};
