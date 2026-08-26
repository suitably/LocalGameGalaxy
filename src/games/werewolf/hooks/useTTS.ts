import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { storage } from '../../../lib/storage';

const WEREWOLF_TTS_STORAGE_KEY = 'werewolf_narrator_tts_enabled';

/**
 * `useTTS` — Werewolf Narrator Text-to-Speech Hook
 *
 * Provides narrator speech output during Werewolf night and day phases using
 * the browser's **Web Speech API** (`window.speechSynthesis`). Automatically
 * selects the best available voice for the current i18n language (`en` / `de`).
 */
export const useTTS = () => {
    const { i18n } = useTranslation();
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [enabled, setEnabledState] = useState<boolean>(() => {
        const stored = storage.get(WEREWOLF_TTS_STORAGE_KEY as any);
        return stored !== 'false';
    });

    const setEnabled = useCallback((value: boolean) => {
        setEnabledState(value);
        storage.set(WEREWOLF_TTS_STORAGE_KEY as any, value ? 'true' : 'false');
        if (!value && typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            return;
        }

        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            setVoices(availableVoices);
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.onvoiceschanged = null;
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const speak = useCallback((text: string) => {
        if (!enabled || !text || typeof window === 'undefined' || !window.speechSynthesis) return;

        // stop any current speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const currentLang = i18n.language?.startsWith('de') ? 'de' : 'en';

        // Find best voice
        const voice = voices.find(v => v.lang.startsWith(currentLang));
        if (voice) {
            utterance.voice = voice;
        }

        utterance.rate = 0.95;
        utterance.pitch = 0.95;

        window.speechSynthesis.speak(utterance);
    }, [enabled, i18n.language, voices]);

    const cancel = useCallback((() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }), []);

    return { speak, cancel, enabled, setEnabled };
};
