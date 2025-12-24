import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const useTTS = () => {
    const { i18n } = useTranslation();
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            setVoices(availableVoices);
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    const speak = useCallback((text: string) => {
        if (!text) return;

        // stop any current speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const currentLang = i18n.language; // 'en' or 'de'

        // Find best voice
        const voice = voices.find(v => v.lang.startsWith(currentLang));
        if (voice) {
            utterance.voice = voice;
        }

        // Adjust rate/pitch if needed
        utterance.rate = 1;
        utterance.pitch = 1;

        window.speechSynthesis.speak(utterance);
    }, [i18n.language, voices]);

    const cancel = useCallback(() => {
        window.speechSynthesis.cancel();
    }, []);

    return { speak, cancel };
};
