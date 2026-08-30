import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

i18n
    .use(HttpBackend)
    .use(initReactI18next)
    .init({
        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
        },
        lng: (typeof localStorage !== 'undefined' ? localStorage.getItem('language') : null) || "en",
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    });

i18n.on('languageChanged', (lng) => {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('language', lng);
    }
});

export default i18n;
