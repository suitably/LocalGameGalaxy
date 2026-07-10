import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * `useTTS` — Werewolf Narrator Text-to-Speech Hook
 *
 * Provides narrator speech output during the Werewolf night phase using the
 * browser's **Web Speech API** (`window.speechSynthesis`). Automatically
 * selects the best available voice for the current i18n language (`en` / `de`).
 *
 * **Browser Requirement**: The Web Speech API must be supported. Falls back
 * silently if `speechSynthesis` is unavailable (e.g., in WebViews).
 *
 * @returns `{ speak, cancel }`
 *   - `speak(text)` — Cancels any in-progress speech and immediately reads `text`.
 *   - `cancel()` — Stops any currently playing utterance.
 *
 * @example
 * const { speak, cancel } = useTTS();
 * speak(role.narratorText); // Read the narrator line for the current role
 * return () => cancel();    // Clean up on unmount
 */
export const useTTS = () => {
    const { i18n } = useTranslation();
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

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
            }
        };
    }, []);

    const speak = useCallback((text: string) => {
        if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;

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
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }, []);

    return { speak, cancel };
};
