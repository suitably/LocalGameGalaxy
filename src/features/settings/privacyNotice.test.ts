import { describe, expect, it } from 'vitest';
import { privacyNoticePath } from './privacyNotice';

describe('privacyNoticePath', () => {
  it('opens the German notice for German', () => {
    expect(privacyNoticePath('de')).toBe('/datenschutz.html');
    expect(privacyNoticePath('de-AT')).toBe('/datenschutz.html');
  });

  it('opens the English notice otherwise', () => {
    expect(privacyNoticePath('en')).toBe('/privacy.html');
    expect(privacyNoticePath(undefined)).toBe('/privacy.html');
  });
});
