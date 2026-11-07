import type { PartyGameType } from './universalPartyManager';

/** Product names of the party games (the same in every language). */
export const PARTY_GAME_TITLES: Record<PartyGameType, string> = {
  guessart: 'GuessArt',
  garticphone: 'Gartic Phone',
  storyteller: 'Storyteller',
  'melodiq-notes': 'Melodiq Notes',
  tabletop: 'Tabletop Spiel',
  knister: 'Knister',
};
