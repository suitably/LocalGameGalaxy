import { beforeEach, describe, expect, it } from 'vitest';
import { storage, STORAGE_KEYS } from '../storage';
import { setHelperActive, setHelperUrl } from '../companion/companionSettings';
import {
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
    storage.remove(STORAGE_KEYS.HELPER_URL);
    storage.remove(STORAGE_KEYS.HELPER_ACTIVE);
    storage.remove(STORAGE_KEYS.NTFY_SERVER_URL);
    storage.remove('tabletop_disabled_tracker_urls');
  });

  it('derives a secure tracker URL from an https helper', () => {
    setHelperUrl('https://galaxy.example.com:3443');
    expect(getSignalingUrl()).toBe('wss://galaxy.example.com:8000');
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
