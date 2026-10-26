export type AppSettingsSection =
  'general' | 'audio' | 'connectivity' | 'notifications' | 'integrations' | 'about';
export type SettingsHighlight =
  'pat' | 'usdb' | 'language' | 'appearance' | 'signaling' | 'companion' | 'setup';
export type SettingsTarget =
  | { kind: 'list' }
  | { kind: 'app'; section: AppSettingsSection; highlight?: SettingsHighlight }
  | { kind: 'game'; gameId: string; section?: string; highlight?: string };

export type ParsedSettingsLocation = SettingsTarget & {
  pairing?: { serverUrl: string; code: string };
};

export const APP_SETTINGS_SECTIONS: readonly AppSettingsSection[] = [
  'general',
  'audio',
  'connectivity',
  'notifications',
  'integrations',
  'about',
];
const HIGHLIGHTS: readonly SettingsHighlight[] = [
  'pat',
  'usdb',
  'language',
  'appearance',
  'signaling',
  'companion',
  'setup',
];

const isAppSection = (v: string): v is AppSettingsSection =>
  (APP_SETTINGS_SECTIONS as readonly string[]).includes(v);
const isHighlight = (v: string): v is SettingsHighlight =>
  (HIGHLIGHTS as readonly string[]).includes(v);

const enc = encodeURIComponent;

/** Builds the URL for a settings target (inverse of parseSettingsLocation). */
export function settingsPath(target: SettingsTarget): string {
  switch (target.kind) {
    case 'list':
      return '/settings';
    case 'app': {
      const base = `/settings/${target.section}`;
      return target.highlight ? `${base}?highlight=${enc(target.highlight)}` : base;
    }
    case 'game': {
      const base = `/settings/games/${enc(target.gameId)}${
        target.section ? `/${enc(target.section)}` : ''
      }`;
      return target.highlight ? `${base}?highlight=${enc(target.highlight)}` : base;
    }
  }
}

const decode = (s: string): string => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** Parses a `/settings…` location. Only `pair` + `code` are honoured as legacy query params. */
export function parseSettingsLocation(pathname: string, search: string): ParsedSettingsLocation {
  const params = new URLSearchParams(search);
  const pair = params.get('pair');
  const code = params.get('code');
  if (pair && code) {
    return { kind: 'app', section: 'connectivity', pairing: { serverUrl: pair, code } };
  }
  const segments = pathname.split('/').filter(Boolean).map(decode);
  if (segments[0] !== 'settings') return { kind: 'list' };
  const highlight = params.get('highlight') || undefined;
  const [, first, second, third] = segments;
  if (first === 'games') {
    if (!second) return { kind: 'list' };
    return {
      kind: 'game',
      gameId: second,
      ...(third && { section: third }),
      ...(highlight && { highlight }),
    };
  }
  if (first && isAppSection(first) && !second) {
    return {
      kind: 'app',
      section: first,
      ...(highlight && isHighlight(highlight) && { highlight }),
    };
  }
  return { kind: 'list' };
}
