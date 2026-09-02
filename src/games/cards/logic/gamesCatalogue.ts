import type { CardGameDefinition } from './types';

export const BUILT_IN_CARD_GAMES: CardGameDefinition[] = [
  {
    id: 'schwimmen',
    name: 'Schwimmen (31)',
    nameKey: 'games.cards.schwimmen.title',
    description: '3 Leben + Schwimmring! Verlierer der Runde verlieren Leben. ⚡ Blitz (31) zieht allen anderen 1 Leben ab.',
    descriptionKey: 'games.cards.schwimmen.description',
    trackerType: 'lives_elimination',
    defaultLives: 3,
    minPlayers: 2,
    maxPlayers: 9,
    icon: '🏊',
    color: '#00acc1',
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

export const getAllCardGames = (): CardGameDefinition[] => {
  return BUILT_IN_CARD_GAMES;
};

