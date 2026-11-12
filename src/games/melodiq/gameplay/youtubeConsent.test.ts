import { describe, it, expect, beforeEach } from 'vitest';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import { getYouTubeConsent, hasYouTubeConsent, setYouTubeConsent } from './youtubeConsent';

describe('youtubeConsent', () => {
  beforeEach(() => {
    storage.remove(STORAGE_KEYS.MELODIQ_YOUTUBE_CONSENT);
  });

  it('is unset when the player was never asked', () => {
    expect(getYouTubeConsent()).toBe('unset');
    expect(hasYouTubeConsent()).toBe(false);
  });

  it('remembers a granted choice', () => {
    setYouTubeConsent('granted');
    expect(getYouTubeConsent()).toBe('granted');
    expect(hasYouTubeConsent()).toBe(true);
  });

  it('remembers a denied choice so the player is not asked again', () => {
    setYouTubeConsent('denied');
    expect(getYouTubeConsent()).toBe('denied');
    expect(hasYouTubeConsent()).toBe(false);
  });

  it('can be revoked after it was granted', () => {
    setYouTubeConsent('granted');
    setYouTubeConsent('denied');
    expect(hasYouTubeConsent()).toBe(false);
  });

  it('reads the legacy value "1" as granted', () => {
    storage.set(STORAGE_KEYS.MELODIQ_YOUTUBE_CONSENT, '1');
    expect(getYouTubeConsent()).toBe('granted');
  });
});
