/**
 * Golf strings, German and English, added to the i18next store at module load [ID: UI-GOLF-I18N]
 */
import i18next from 'i18next';

const de = {
  title: 'Golf',
  setup: {
    intro:
      'Golf (Sechs-Karten-Golf) mit 2–6 Spielern an einem Gerät. Alle Karten sind öffentlich – das Gerät muss nicht weitergegeben werden.',
    players: 'Mitspieler',
    start: 'Partie starten',
    default_player: 'Spieler {{n}}',
  },
  rules: {
    title: 'Regeln in Kürze',
    start:
      'Jeder hat sechs verdeckte Karten (2 Reihen à 3). Zu Beginn deckt jeder reihum zwei eigene Karten auf.',
    turn: 'Ziehe vom Stapel oder nimm die oberste Ablagekarte. Tausche sie gegen eine eigene Karte (die alte Karte geht offen auf die Ablage) oder – nur bei einer Stapelkarte – lege sie ab und decke eine verdeckte Karte auf.',
    end: 'Sind bei einem Spieler alle sechs Karten offen, hat jeder andere noch genau einen Zug. Danach wird gewertet.',
    scoring:
      'Punkte: Ass=1, 2–10 Augenzahl, Bube und Dame=10, König=0, Joker=−2. Zwei gleiche Karten untereinander (gleiche Spalte) zählen 0; Joker heben sich nicht auf. Gespielt werden 9 Löcher, wer am Ende die wenigsten Punkte hat, gewinnt.',
  },
  card: {
    face_down: 'Verdeckte Karte {{n}} von {{name}}',
    face_up: 'Karte {{n}} von {{name}}: {{card}}',
    draw_pile: 'Stapel, verdeckt',
  },
  table: {
    turn_of: 'Am Zug: {{name}}',
    final_lap: '{{name}} hat alle Karten aufgedeckt – jeder andere hat noch einen Zug!',
    hole: 'Loch {{n}} von {{total}}',
    draw_pile: 'Stapel ({{count}})',
    discard_pile: 'Ablage',
    drawn: 'Gezogen',
    player_score: '{{name}} – {{score}} Punkte',
  },
  hint: {
    flip_start: '{{name}}: Decke noch {{count}} eigene Karte(n) auf.',
    turn: 'Ziehe eine Karte vom Stapel oder nimm die oberste Ablagekarte.',
    must_swap: 'Diese Karte kam von der Ablage – tausche sie gegen eine eigene Karte.',
    swap_or_discard: 'Tippe eine eigene Karte zum Tauschen an oder lege die Karte ab.',
    pick_flip: 'Tippe eine verdeckte Karte an, die aufgedeckt wird.',
  },
  actions: {
    draw_deck: 'Vom Stapel ziehen',
    draw_discard: 'Ablage nehmen',
    discard: 'Ablegen',
    discard_flip: 'Ablegen und Karte aufdecken',
    cancel: 'Abbrechen',
    next_round: 'Nächstes Loch',
    restart: 'Neue Partie',
  },
  summary: {
    hole_title: 'Loch {{n}} beendet',
    game_over: 'Partie beendet',
    winner: 'Gewonnen: {{names}}',
    player: 'Spieler',
    hole: 'Loch',
    cards: 'Karten',
    total: 'Gesamt',
  },
};

const en: typeof de = {
  title: 'Golf',
  setup: {
    intro:
      'Six-card Golf for 2–6 players on one device. All cards are public, so the device never needs to be handed over.',
    players: 'Players',
    start: 'Start game',
    default_player: 'Player {{n}}',
  },
  rules: {
    title: 'Rules in short',
    start:
      'Everyone has six face-down cards (2 rows of 3). At the start each player in turn flips two of their own cards.',
    turn: 'Draw from the deck or take the top discard. Swap it with one of your cards (the old card goes face up onto the discard pile) or, only for a deck card, discard it and flip one face-down card.',
    end: 'When a player has all six cards face up, every other player gets exactly one more turn. Then the hole is scored.',
    scoring:
      'Points: Ace=1, 2–10 face value, Jack and Queen=10, King=0, Joker=−2. Two equal cards in one column count 0; jokers never cancel. You play 9 holes and the lowest total wins.',
  },
  card: {
    face_down: 'Face-down card {{n}} of {{name}}',
    face_up: 'Card {{n}} of {{name}}: {{card}}',
    draw_pile: 'Draw pile, face down',
  },
  table: {
    turn_of: 'Turn: {{name}}',
    final_lap: '{{name}} has all cards face up – everyone else gets one more turn!',
    hole: 'Hole {{n}} of {{total}}',
    draw_pile: 'Deck ({{count}})',
    discard_pile: 'Discard',
    drawn: 'Drawn',
    player_score: '{{name}} – {{score}} points',
  },
  hint: {
    flip_start: '{{name}}: flip {{count}} more of your cards.',
    turn: 'Draw a card from the deck or take the top discard.',
    must_swap: 'This card came from the discard pile – swap it with one of your cards.',
    swap_or_discard: 'Tap one of your cards to swap, or discard the drawn card.',
    pick_flip: 'Tap a face-down card to flip it.',
  },
  actions: {
    draw_deck: 'Draw from deck',
    draw_discard: 'Take discard',
    discard: 'Discard',
    discard_flip: 'Discard and flip a card',
    cancel: 'Cancel',
    next_round: 'Next hole',
    restart: 'New game',
  },
  summary: {
    hole_title: 'Hole {{n}} finished',
    game_over: 'Game over',
    winner: 'Winner: {{names}}',
    player: 'Player',
    hole: 'Hole',
    cards: 'Cards',
    total: 'Total',
  },
};

let initialized = false;

/** Adds the Golf bundles once i18next is ready (safe to call repeatedly). */
export const initGolfI18n = () => {
  if (initialized) return;
  const add = () => {
    if (initialized) return;
    initialized = true;
    i18next.addResourceBundle('de', 'translation', { games: { golf: de } }, true, false);
    i18next.addResourceBundle('en', 'translation', { games: { golf: en } }, true, false);
  };
  if (i18next.isInitialized) {
    add();
  } else {
    i18next.on('initialized', add);
  }
};
