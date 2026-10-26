import { describe, expect, it } from 'vitest';
import { parseSettingsLocation, settingsPath, type SettingsTarget } from './settingsRoutes';

describe('settingsPath', () => {
  const cases: [SettingsTarget, string][] = [
    [{ kind: 'list' }, '/settings'],
    [{ kind: 'app', section: 'general' }, '/settings/general'],
    [{ kind: 'app', section: 'audio' }, '/settings/audio'],
    [
      { kind: 'app', section: 'connectivity', highlight: 'usdb' },
      '/settings/connectivity?highlight=usdb',
    ],
    [
      { kind: 'app', section: 'integrations', highlight: 'pat' },
      '/settings/integrations?highlight=pat',
    ],
    [{ kind: 'game', gameId: 'wordle' }, '/settings/games/wordle'],
    [{ kind: 'game', gameId: 'melodiq', section: 'gameplay' }, '/settings/games/melodiq/gameplay'],
    [
      { kind: 'game', gameId: 'melodiq', section: 'gameplay', highlight: 'a b&c' },
      '/settings/games/melodiq/gameplay?highlight=a%20b%26c',
    ],
  ];
  it.each(cases)('%j -> %s', (target, path) => {
    expect(settingsPath(target)).toBe(path);
  });
});

describe('parseSettingsLocation', () => {
  const cases: [string, string, string, unknown][] = [
    ['list', '/settings', '', { kind: 'list' }],
    ['app section', '/settings/notifications', '', { kind: 'app', section: 'notifications' }],
    [
      'highlight',
      '/settings/connectivity',
      '?highlight=usdb',
      { kind: 'app', section: 'connectivity', highlight: 'usdb' },
    ],
    [
      'unknown highlight',
      '/settings/general',
      '?highlight=zzz',
      { kind: 'app', section: 'general' },
    ],
    ['game without section', '/settings/games/wordle', '', { kind: 'game', gameId: 'wordle' }],
    [
      'game with section',
      '/settings/games/melodiq/gameplay',
      '',
      { kind: 'game', gameId: 'melodiq', section: 'gameplay' },
    ],
    ['unknown section', '/settings/nope', '', { kind: 'list' }],
    ['games without id', '/settings/games', '', { kind: 'list' }],
    ['legacy tab=melodiq', '/settings', '?tab=melodiq&sub=gameplay', { kind: 'list' }],
    ['legacy missing_pat ignored', '/settings', '?missing_pat=1', { kind: 'list' }],
    [
      'legacy pairing',
      '/settings',
      '?tab=server&pair=http%3A%2F%2Fa%3A1&code=X',
      { kind: 'app', section: 'connectivity', pairing: { serverUrl: 'http://a:1', code: 'X' } },
    ],
    [
      'new pairing',
      '/settings/connectivity',
      '?pair=http%3A%2F%2Fa%3A1&code=Y',
      { kind: 'app', section: 'connectivity', pairing: { serverUrl: 'http://a:1', code: 'Y' } },
    ],
  ];
  it.each(cases)('%s', (_name, pathname, search, expected) => {
    expect(parseSettingsLocation(pathname, search)).toEqual(expected);
  });

  it('round-trips settingsPath', () => {
    const target: SettingsTarget = { kind: 'game', gameId: 'melodiq', section: 'client' };
    const [pathname] = settingsPath(target).split('?');
    expect(parseSettingsLocation(pathname, '')).toEqual(target);
  });
});
