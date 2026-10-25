/**
 * useWordleScreen.ts - Screen state for WordleGame: dialogs, duel URL and timed effects.
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { parseGameUrlParams } from '../../../modules/sharing';
import { wordleEngine } from '../logic/wordleEngine';
import type { WordleGameMode } from '../logic/types';
import { useWordle } from './useWordle';

export type WordleDialog = 'stats' | 'duel' | 'help' | 'history' | 'settings';

export function useWordleScreen() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const [openDialog, setOpenDialog] = useState<WordleDialog | null>(null);

  const duelParam = parseGameUrlParams(location.search, location.hash).get('duel');
  const customDuelWord = duelParam ? wordleEngine.decodeDuelWord(duelParam) : null;
  const initialMode: WordleGameMode = customDuelWord ? 'duel' : 'daily';

  const game = useWordle(i18n.language || 'de', initialMode, customDuelWord);
  const { justFinished, clearShake } = game;
  const shaking = game.state.invalidWordShake;

  // Open the stats dialog only when the game has just finished in this session.
  useEffect(() => {
    if (!justFinished) return;
    const timer = setTimeout(() => setOpenDialog('stats'), 1200);
    return () => clearTimeout(timer);
  }, [justFinished]);

  // Clear the shake animation after 600ms.
  useEffect(() => {
    if (!shaking) return;
    const timer = setTimeout(clearShake, 600);
    return () => clearTimeout(timer);
  }, [shaking, clearShake]);

  return {
    ...game,
    language: i18n.language || 'de',
    openDialog,
    open: setOpenDialog,
    close: () => setOpenDialog(null),
  };
}
