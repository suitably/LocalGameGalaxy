import { beforeEach, describe, expect, it } from 'vitest';
import { storage, STORAGE_KEYS } from '../storage';
import { setHelperActive, setHelperUrl } from '../companion/companionSettings';
import {
  builtInSignalingUrl,
  detectHelperSignaling,
  getDisabledTrackerUrls,
  getSignalingUrl,
  setDisabledTrackerUrls,
  setSignalingUrl,
} from './signalingSettings';
import {
  getNtfyServerUrl,
  setNtfyServerUrl,
  setUserNtfyTopic,
  getUserNtfyTopic,
} from '../push/pushSettings';

describe('device settings modules', () => {
  beforeEach(() => {
    storage.remove(STORAGE_KEYS.SIGNALING_URL);
    storage.remove(STORAGE_KEYS.SIGNALING_DETECTED);
    storage.remove(STORAGE_KEYS.HELPER_URL);
    storage.remove(STORAGE_KEYS.HELPER_ACTIVE);
    storage.remove(STORAGE_KEYS.NTFY_SERVER_URL);
    storage.remove('tabletop_disabled_tracker_urls');
  });

  it('derives a secure tracker URL from an https helper', () => {
    setHelperUrl('https://galaxy.example.com:3443');
    expect(getSignalingUrl()).toBe('wss://galaxy.example.com:8000');
  });

  it('builds the built-in tracker URL on the helper origin', () => {
    expect(builtInSignalingUrl('https://helper.example.com', '/signaling')).toBe(
      'wss://helper.example.com/signaling',
    );
    expect(builtInSignalingUrl('http://192.168.1.5:3000/', '/signaling')).toBe(
      'ws://192.168.1.5:3000/signaling',
    );
    expect(builtInSignalingUrl('https://helper.example.com', undefined)).toBeNull();
    expect(builtInSignalingUrl('not a url', '/signaling')).toBeNull();
  });

  it('uses the tracker the companion server reports, until the helper URL changes', async () => {
    const info = (body: unknown) =>
      (async () => new Response(JSON.stringify(body))) as typeof fetch;
    setHelperUrl('https://helper.example.com');
    expect(await detectHelperSignaling(info({ signaling: '/signaling' }))).toBe(true);
    expect(getSignalingUrl()).toBe('wss://helper.example.com/signaling');
    expect(await detectHelperSignaling(info({ signaling: '/signaling' }))).toBe(false);

    // an unreachable server keeps the last answer
    const offline = (async () => {
      throw new Error('offline');
    }) as typeof fetch;
    expect(await detectHelperSignaling(offline)).toBe(false);
    expect(getSignalingUrl()).toBe('wss://helper.example.com/signaling');

    setHelperUrl('https://other.example.com');
    expect(getSignalingUrl()).toBe('wss://other.example.com:8000');

    // an older server without a built-in tracker clears the answer
    setHelperUrl('https://helper.example.com');
    expect(await detectHelperSignaling(info({ name: 'old' }))).toBe(true);
    expect(getSignalingUrl()).toBe('wss://helper.example.com:8000');
  });

  it('prefers a custom signaling URL and is empty without helper', () => {
    setHelperActive(false);
    expect(getSignalingUrl()).toBe('');
    setSignalingUrl('wss://tracker.example.com');
    expect(getSignalingUrl()).toBe('wss://tracker.example.com');
  });

  it('keeps disabled trackers per game', () => {
    setDisabledTrackerUrls(['wss://a'], 'tabletop');
    expect(getDisabledTrackerUrls('tabletop')).toEqual(['wss://a']);
    expect(getDisabledTrackerUrls('other-game')).toEqual([]);
  });

  it('normalises ntfy server URL and topic', () => {
    setNtfyServerUrl('  https://ntfy.example.com/ ');
    expect(getNtfyServerUrl()).toBe('https://ntfy.example.com');
    setNtfyServerUrl('');
    expect(getNtfyServerUrl()).toBe('https://ntfy.sh');
    setUserNtfyTopic('my topic!');
    expect(getUserNtfyTopic()).toBe('my_topic_');
  });
});
