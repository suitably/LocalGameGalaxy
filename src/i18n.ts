import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

const getInitialLanguage = (): string => {
    if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('lgg_language') || localStorage.getItem('language');
        if (saved) return saved;
    }
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
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('lgg_language', lng);
        localStorage.setItem('language', lng);
    }
});

export default i18n;
