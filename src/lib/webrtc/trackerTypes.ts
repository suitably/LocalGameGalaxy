export interface TrackerItem {
  url: string;
  type: 'backend' | 'public' | 'custom';
  enabled: boolean;
}

export const DEFAULT_PUBLIC_TRACKERS: readonly string[] = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.webtorrent.dev',
];
