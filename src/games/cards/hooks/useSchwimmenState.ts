import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createCardPlayers } from '../logic/cardPlayers';
import { adjustPlayerLives, processSchwimmenRound } from '../logic/schwimmenEngine';
import type { CardPlayer } from '../logic/types';

export interface SchwimmenHistoryEntry {
  round: number;
  description: string;
  losers: string[];
  isBlitz: boolean;
  blitzWinnerName?: string;
  snapshot: CardPlayer[];
}

const names = (players: CardPlayer[]): string => players.map((p) => p.name).join(', ');

/** State and handlers of a Schwimmen (31) life tracker; the rules live in `schwimmenEngine`. */
export const useSchwimmenState = (initialPlayers: string[], defaultLives: number) => {
  const { t } = useTranslation();

  const [players, setPlayers] = useState<CardPlayer[]>(() =>
    createCardPlayers(initialPlayers, defaultLives),
  );
  const [roundNumber, setRoundNumber] = useState(1);
  const [selectedLoserIds, setSelectedLoserIds] = useState<string[]>([]);
  const [roundHistory, setRoundHistory] = useState<SchwimmenHistoryEntry[]>([]);
  const [winner, setWinner] = useState<CardPlayer | null>(null);
  const [blitzConfirmPlayer, setBlitzConfirmPlayer] = useState<CardPlayer | null>(null);

  const activePlayers = players.filter((p) => !p.isEliminated);

  const applyRound = (
    result: ReturnType<typeof processSchwimmenRound>,
    entry: Omit<SchwimmenHistoryEntry, 'round' | 'snapshot'>,
  ) => {
    setRoundHistory((prev) => [{ ...entry, round: roundNumber, snapshot: players }, ...prev]);
    setPlayers(result.updatedPlayers);
    setSelectedLoserIds([]);
    setRoundNumber((r) => r + 1);
    if (result.isGameOver && result.winner) setWinner(result.winner);
  };

  const toggleLoser = (playerId: string) => {
    setSelectedLoserIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId],
    );
  };

  const evaluateRound = () => {
    if (selectedLoserIds.length === 0) return;
    const result = processSchwimmenRound(players, { losers: selectedLoserIds });
    const loserNames = names(players.filter((p) => selectedLoserIds.includes(p.id)));
    applyRound(result, {
      description: `${loserNames} ${t('games.cards.schwimmen.lost_life_desc', 'verliert 1 Leben')}`,
      losers: selectedLoserIds,
      isBlitz: false,
    });
  };

  const executeBlitz = (player: CardPlayer) => {
    const result = processSchwimmenRound(players, { blitzWinnerId: player.id });
    const penalized = names(players.filter((p) => !p.isEliminated && p.id !== player.id));
    applyRound(result, {
      description: t('games.cards.schwimmen.blitz_history', {
        defaultValue: 'Blitz von {{name}}! ({{others}} -1 Leben)',
        name: player.name,
        others: penalized,
      }),
      losers: result.losers,
      isBlitz: true,
      blitzWinnerName: player.name,
    });
    setBlitzConfirmPlayer(null);
  };

  const undo = () => {
    if (roundHistory.length === 0) return;
    setPlayers(roundHistory[0].snapshot);
    setRoundHistory((prev) => prev.slice(1));
    setRoundNumber((r) => Math.max(1, r - 1));
    setSelectedLoserIds([]);
    setWinner(null);
  };

  const adjustLife = (playerId: string, delta: number) => {
    setPlayers((prev) => adjustPlayerLives(prev, playerId, delta, defaultLives));
  };

  const restart = () => {
    setPlayers(createCardPlayers(initialPlayers, defaultLives));
    setRoundNumber(1);
    setSelectedLoserIds([]);
    setRoundHistory([]);
    setWinner(null);
    setBlitzConfirmPlayer(null);
  };

  return {
    players,
    activePlayers,
    roundNumber,
    selectedLoserIds,
    roundHistory,
    winner,
    blitzConfirmPlayer,
    setBlitzConfirmPlayer,
    toggleLoser,
    evaluateRound,
    executeBlitz,
    undo,
    adjustLife,
    restart,
  };
};
