import type { CardGameDefinition } from './types';
import { storage } from '../../../lib/storage';

export const BUILT_IN_CARD_GAMES: CardGameDefinition[] = [
  {
    id: 'schwimmen',
    name: 'Schwimmen (31)',
    nameKey: 'games.cards.schwimmen.title',
    description: '3 Leben + Schwimmring! Der Spieler mit den wenigsten Punkten verliert ein Leben. 31/Feuer beendet die Runde sofort.',
    descriptionKey: 'games.cards.schwimmen.description',
    trackerType: 'lives_elimination',
    defaultLives: 3,
    minPlayers: 2,
    maxPlayers: 9,
    icon: '🏊',
    color: '#00acc1',
    scoringRules: {
      feuerPoints: 33, // 3 Assen / Feuer
    },
  },
  {
    id: 'ohell',
    name: 'Oh Hell / Wizard',
    nameKey: 'games.cards.ohell.title',
    description: 'Stiche vorhersagen! Richtige Ansagen belohnen mit 20 Bonuspunkten + 10P pro Stich. Abweichungen kosten Punkte.',
    descriptionKey: 'games.cards.ohell.description',
    trackerType: 'bids_and_tricks',
    minPlayers: 2,
    maxPlayers: 8,
    icon: '🧙‍♂️',
    color: '#ab47bc',
    scoringRules: {
      correctBidBonus: 20,
      pointsPerTrick: 10,
      diffPenalty: 10,
      allowEqualBidsAndCards: false, // Hook rule
      roundsSequence: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    },
  },
  {
    id: 'score_tracker',
    name: 'Universeller Punktezähler',
    nameKey: 'games.cards.universal.title',
    description: 'Freier Runden-Punktezähler für Rommé, Doppelkopf, Skat, Phase 10, Skyjo oder eigene Kartenspiele.',
    descriptionKey: 'games.cards.universal.description',
    trackerType: 'score_accumulator',
    minPlayers: 2,
    maxPlayers: 12,
    icon: '🃏',
    color: '#ffa726',
  },
];

const STORAGE_KEY_CUSTOM_CARD_GAMES = 'cards_custom_games';

export const getCustomCardGames = (): CardGameDefinition[] => {
  return storage.getJson<CardGameDefinition[]>(STORAGE_KEY_CUSTOM_CARD_GAMES, []);
};

export const saveCustomCardGame = (game: CardGameDefinition): void => {
  const existing = getCustomCardGames();
  const filtered = existing.filter((g) => g.id !== game.id);
  storage.setJson(STORAGE_KEY_CUSTOM_CARD_GAMES, [...filtered, { ...game, isCustom: true }]);
};

export const deleteCustomCardGame = (gameId: string): void => {
  const existing = getCustomCardGames();
  storage.setJson(
    STORAGE_KEY_CUSTOM_CARD_GAMES,
    existing.filter((g) => g.id !== gameId),
  );
};

export const getAllCardGames = (): CardGameDefinition[] => {
  return [...BUILT_IN_CARD_GAMES, ...getCustomCardGames()];
};
