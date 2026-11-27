import { describe, it, expect, beforeEach } from 'vitest';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import {
  getYouTubeConsent,
  hasYouTubeConsent,
  resolveYouTubeConsentGate,
  setYouTubeConsent,
} from './youtubeConsent';

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

describe('resolveYouTubeConsentGate', () => {
  const base = {
    localConsent: 'unset' as const,
    hasYouTubeVideo: true,
    hideBackgroundVideo: false,
    isPassive: false,
  };

  it('asks on the host before a YouTube background loads', () => {
    expect(resolveYouTubeConsentGate(base)).toEqual({ allowed: false, pending: true });
  });

  it('does not ask on the host when the background is hidden or not from YouTube', () => {
    expect(resolveYouTubeConsentGate({ ...base, hideBackgroundVideo: true }).pending).toBe(false);
    expect(resolveYouTubeConsentGate({ ...base, hasYouTubeVideo: false }).pending).toBe(false);
  });

  it('never asks on a TV or phone and follows the host answer', () => {
    const passive = { ...base, isPassive: true };
    expect(resolveYouTubeConsentGate(passive)).toEqual({ allowed: false, pending: false });
    expect(resolveYouTubeConsentGate({ ...passive, hostConsent: 'granted' })).toEqual({
      allowed: true,
      pending: false,
    });
    expect(
      resolveYouTubeConsentGate({ ...passive, localConsent: 'granted', hostConsent: 'denied' })
        .allowed,
    ).toBe(false);
  });

  it('uses the device choice on a TV until the host answer arrives', () => {
    expect(
      resolveYouTubeConsentGate({ ...base, isPassive: true, localConsent: 'granted' }).allowed,
    ).toBe(true);
  });
});
