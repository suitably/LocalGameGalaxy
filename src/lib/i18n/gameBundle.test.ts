import i18n from 'i18next';
import { describe, expect, it } from 'vitest';
import { registerGameBundle } from './gameBundle';

describe('registerGameBundle', () => {
  it('waits for i18next, then deep-merges both languages once', async () => {
    const bundle = {
      de: { games: { demo: { hi: 'Hallo' } } },
      en: { games: { demo: { hi: 'Hi' } } },
    };
    registerGameBundle(bundle);
    expect(i18n.isInitialized).toBeFalsy();

    await i18n.init({
      lng: 'de',
      resources: {
        de: { translation: { games: { demo: { title: 'Demo' } } } },
        en: { translation: {} },
      },
    });
    expect(i18n.t('games.demo.hi')).toBe('Hallo');
    expect(i18n.t('games.demo.title')).toBe('Demo');
    expect(i18n.getFixedT('en')('games.demo.hi')).toBe('Hi');

    i18n.addResourceBundle('de', 'translation', { games: { demo: { hi: 'Servus' } } }, true, true);
    registerGameBundle(bundle);
    expect(i18n.t('games.demo.hi')).toBe('Servus');
  });
});
