import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_STUN_SERVERS,
  addCustomStunUrl,
  removeCustomStunUrl,
  buildStunServers,
  getIceServers,
  isValidStunUrl,
  loadStunSettings,
  saveStunSettings,
  toIceServers,
} from './iceServers';
import { storage, STORAGE_KEYS } from '../storage';

const GOOGLE_STUN = 'stun:stun.l.google.com:19302';

describe('WebRTC STUN server selection', () => {
  beforeEach(() => {
    storage.remove(STORAGE_KEYS.WEBRTC_STUN_CUSTOM_URLS);
    storage.remove(STORAGE_KEYS.WEBRTC_STUN_PREFERENCES);
  });

  it('lists Google as selectable but disabled by default', () => {
    const items = buildStunServers({ customUrls: [], preferences: {} });

    expect(items.map((item) => item.url)).toEqual(DEFAULT_STUN_SERVERS.map((server) => server.url));
    expect(items.find((item) => item.url === GOOGLE_STUN)?.enabled).toBe(false);
    expect(items.filter((item) => item.enabled).length).toBeGreaterThan(0);
  });

  it('lets explicit preferences override defaults', () => {
    const items = buildStunServers({
      customUrls: [],
      preferences: { [GOOGLE_STUN]: true, 'stun:stun.cloudflare.com:3478': false },
    });

    expect(items.find((item) => item.url === GOOGLE_STUN)?.enabled).toBe(true);
    expect(items.find((item) => item.url === 'stun:stun.cloudflare.com:3478')?.enabled).toBe(false);
  });

  it('appends custom servers once, enabled unless disabled explicitly', () => {
    const items = buildStunServers({
      customUrls: [
        'stun:stun.example.org:3478',
        'stun:stun.example.org:3478',
        GOOGLE_STUN,
        'stun:off.example.org',
      ],
      preferences: { 'stun:off.example.org': false },
    });

    const custom = items.filter((item) => item.type === 'custom');
    expect(custom).toEqual([
      { url: 'stun:stun.example.org:3478', type: 'custom', enabled: true },
      { url: 'stun:off.example.org', type: 'custom', enabled: false },
    ]);
  });

  it('maps only enabled servers to iceServers', () => {
    expect(
      toIceServers([
        { url: 'stun:a.example', type: 'default', enabled: true },
        { url: 'stun:b.example', type: 'custom', enabled: false },
      ]),
    ).toEqual([{ urls: 'stun:a.example' }]);
  });

  it('returns an empty list when every server is disabled (LAN-only)', () => {
    const preferences = Object.fromEntries(
      DEFAULT_STUN_SERVERS.map((server) => [server.url, false]),
    );
    expect(toIceServers(buildStunServers({ customUrls: [], preferences }))).toEqual([]);
  });

  it('validates STUN URLs', () => {
    expect(isValidStunUrl('stun:stun.example.org:3478')).toBe(true);
    expect(isValidStunUrl('stuns:stun.example.org')).toBe(true);
    expect(isValidStunUrl(' stun:padded.example ')).toBe(true);
    expect(isValidStunUrl('turn:turn.example.org')).toBe(false);
    expect(isValidStunUrl('https://example.org')).toBe(false);
    expect(isValidStunUrl('stun:')).toBe(false);
    expect(isValidStunUrl('stun:host with space')).toBe(false);
  });

  it('persists settings and reads them back through getIceServers', () => {
    saveStunSettings({
      customUrls: ['stun:own.example:3478'],
      preferences: { [GOOGLE_STUN]: true },
    });

    expect(loadStunSettings()).toEqual({
      customUrls: ['stun:own.example:3478'],
      preferences: { [GOOGLE_STUN]: true },
    });
    expect(getIceServers()).toContainEqual({ urls: GOOGLE_STUN });
    expect(getIceServers()).toContainEqual({ urls: 'stun:own.example:3478' });
  });

  it('ignores malformed stored values', () => {
    storage.set(
      STORAGE_KEYS.WEBRTC_STUN_CUSTOM_URLS,
      JSON.stringify(['stun:ok.example', 42, 'javascript:alert(1)']),
    );
    storage.set(
      STORAGE_KEYS.WEBRTC_STUN_PREFERENCES,
      JSON.stringify({ [GOOGLE_STUN]: 'yes', 'stun:ok.example': false }),
    );

    expect(loadStunSettings()).toEqual({
      customUrls: ['stun:ok.example'],
      preferences: { 'stun:ok.example': false },
    });

    storage.set(STORAGE_KEYS.WEBRTC_STUN_PREFERENCES, 'not json');
    expect(loadStunSettings().preferences).toEqual({});
  });
});

describe('custom STUN URL edits (#422)', () => {
  const empty = { customUrls: [], preferences: {} };

  it('adds a valid URL enabled and rejects invalid or duplicate ones', () => {
    const added = addCustomStunUrl(empty, ' stun:my.host:3478 ');
    expect(added.result).toBe('added');
    expect(added.settings).toEqual({
      customUrls: ['stun:my.host:3478'],
      preferences: { 'stun:my.host:3478': true },
    });
    expect(addCustomStunUrl(empty, 'https://x').result).toBe('invalid');
    expect(addCustomStunUrl(added.settings, 'stun:my.host:3478').result).toBe('duplicate');
    expect(addCustomStunUrl(empty, DEFAULT_STUN_SERVERS[0].url).result).toBe('duplicate');
  });

  it('removes a custom URL together with its preference', () => {
    const settings = {
      customUrls: ['stun:a', 'stun:b'],
      preferences: { 'stun:a': false, 'stun:b': true },
    };
    expect(removeCustomStunUrl(settings, 'stun:a')).toEqual({
      customUrls: ['stun:b'],
      preferences: { 'stun:b': true },
    });
  });
});
