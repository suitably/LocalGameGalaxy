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
          chipLabel: t('signaling.type_backend'),
          chipColor: 'success' as const,
          switchColor: 'success' as const,
          removable: false,
        };
      }
      if (item.type === 'public') {
        return {
          ...item,
          chipLabel: t('signaling.type_public'),
          chipColor: 'info' as const,
          switchColor: 'primary' as const,
          removable: false,
        };
      }
      return {
        ...item,
        chipLabel: t('signaling.type_custom'),
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
        title: t('signaling.title'),
        restoreDefaults: t('signaling.restore_defaults'),
        enable: t('signaling.toggle_enable'),
        disable: t('signaling.toggle_disable'),
        remove: t('signaling.remove_tooltip'),
        placeholder: t('signaling.placeholder'),
        add: t('signaling.add_button'),
        emptyWarning: t('signaling.no_trackers_warning'),
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
