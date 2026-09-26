import { useState, useCallback, useEffect } from 'react';
import { storage } from '../../../lib/storage';
import { DAILY_STORAGE_PREFIX, normalizeWordleLang } from '../logic/wordleStorage';
import { wordleEngine } from '../logic/wordleEngine';
import type { EvaluatedLetter, WordleState } from '../logic/types';

export interface HistoryEntry {
    dateKey: string;
    lang: string;
    targetWord: string;
    guesses: string[];
    evaluations: EvaluatedLetter[][];
    status: 'won' | 'lost' | 'playing';
}

export function useWordleHistory(currentLanguage: string) {
    const [history, setHistory] = useState<HistoryEntry[]>([]);

    const loadHistory = useCallback(() => {
        const langKey = normalizeWordleLang(currentLanguage);
        const prefix = `${DAILY_STORAGE_PREFIX}${langKey}_`;
        const keys = storage.findKeysWithPrefix(prefix);

        const entries: HistoryEntry[] = [];

        for (const key of keys) {
            const dateKey = key.substring(prefix.length);
            // Ignore incomplete date keys if any
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;

            const savedState = storage.getJson<Partial<WordleState> | null>(key, null);
            if (savedState) {
                entries.push({
                    dateKey,
                    lang: langKey,
                    targetWord: wordleEngine.getDailyTargetWord(langKey, dateKey),
                    guesses: Array.isArray(savedState.guesses) ? savedState.guesses : [],
                    evaluations: Array.isArray(savedState.evaluations) ? savedState.evaluations : [],
                    status: savedState.status === 'won' || savedState.status === 'lost' ? savedState.status : 'playing',
                });
            }
        }

        entries.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
        setHistory(entries);
    }, [currentLanguage]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    return { history, refreshHistory: loadHistory };
}
