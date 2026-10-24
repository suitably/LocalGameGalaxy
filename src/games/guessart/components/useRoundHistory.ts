import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LocalGameEngine } from '../logic/engine';
import { addSynonymToWord } from '../logic/catalogueManager';
import type { GuessArtRound, PlayerIdentity } from '../logic/types';

export const getRoundDrawerName = (round: GuessArtRound, players: PlayerIdentity[]): string => {
  if (round.drawnByName) return round.drawnByName;
  const player = players.find((p) => p.id === round.drawnById);
  return player?.name || round.drawnById || 'Spieler 1';
};

export const getRoundGuesserName = (round: GuessArtRound, players: PlayerIdentity[]): string => {
  if (round.guesserName) return round.guesserName;
  const drawerIdx = players.findIndex((p) => p.id === round.drawnById);
  if (drawerIdx >= 0 && players.length > 0) {
    return players[(drawerIdx + 1) % players.length]?.name || 'Spieler 2';
  }
  return round.guesserId || 'Spieler 2';
};

/** Loads the rounds of a game and tracks which accordion is open, replayed or synonym-extended. */
export const useRoundHistory = (open: boolean, gameId: string | null) => {
  const { i18n } = useTranslation();
  const language = i18n.language.startsWith('de') ? 'de' : 'en';
  const [rounds, setRounds] = useState<GuessArtRound[]>([]);
  const [expandedRoundId, setExpandedRoundId] = useState<string | false>(false);
  const [replayingRoundId, setReplayingRoundId] = useState<string | null>(null);
  const [addedSynonyms, setAddedSynonyms] = useState<Set<string>>(new Set());

  const addSynonym = async (targetWord: string, guess: string, lang: string) => {
    try {
      const res = await addSynonymToWord(targetWord, guess, lang);
      if (res.success) {
        setAddedSynonyms((prev) => new Set([...prev, `${targetWord}:::${guess}`]));
      }
    } catch (e) {
      console.warn('Failed to add synonym from history', e);
    }
  };

  const active = open && Boolean(gameId);
  const requestKey = active ? `${gameId}:${language}` : null;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!requestKey || !gameId) return;
    let cancelled = false;
    LocalGameEngine.listRounds(gameId, language)
      .then((data) => {
        if (cancelled) return;
        const sorted = [...(data || [])].sort((a, b) => a.roundNumber - b.roundNumber);
        setRounds(sorted);
        setReplayingRoundId(null);
        // Expand the latest completed round by default if any
        const latestCompleted = [...sorted].reverse().find((r) => r.status === 'completed');
        setExpandedRoundId(latestCompleted?.id ?? sorted[0]?.id ?? false);
      })
      .catch((err) => {
        console.error('Failed to load rounds history', err);
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(requestKey);
      });
    return () => {
      cancelled = true;
      setLoadedKey(null);
    };
  }, [requestKey, gameId, language]);

  const toggleRound = (roundId: string, expanded: boolean) => {
    setExpandedRoundId(expanded ? roundId : false);
    if (!expanded && replayingRoundId === roundId) setReplayingRoundId(null);
  };

  const toggleReplay = (roundId: string) =>
    setReplayingRoundId((current) => (current === roundId ? null : roundId));

  return {
    rounds: active ? rounds : [],
    loading: active && loadedKey !== requestKey,
    expandedRoundId,
    replayingRoundId,
    addedSynonyms,
    addSynonym,
    toggleRound,
    toggleReplay,
  };
};
