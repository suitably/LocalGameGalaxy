import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import { storage, STORAGE_KEYS } from './lib/storage';

const getInitialLanguage = (): string => {
    const saved = storage.get(STORAGE_KEYS.LANGUAGE) || storage.get(STORAGE_KEYS.LANGUAGE_LEGACY);
    if (saved) return saved;
    if (typeof navigator !== 'undefined' && navigator.language) {
        return navigator.language.startsWith('de') ? 'de' : 'en';
    }
    return 'en';
};

i18n
    .use(HttpBackend)
    .use(initReactI18next)
    .init({
        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
        },
        lng: getInitialLanguage(),
        fallbackLng: 'en',
        preload: ['en', 'de'],
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
            bindI18n: 'languageChanged loaded',
            bindI18nStore: 'added removed',
        },
    });

i18n.on('languageChanged', (lng) => {
    storage.set(STORAGE_KEYS.LANGUAGE, lng);
    storage.set(STORAGE_KEYS.LANGUAGE_LEGACY, lng);
});

export default i18n;
