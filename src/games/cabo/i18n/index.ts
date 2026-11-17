/**
 * Cabo strings, German and English, added to the i18next store at module load [ID: UI-CABO-I18N]
 */
import i18next from 'i18next';

const de = {
  title: 'Cabo',
  setup: {
    intro:
      'Cabo mit 2–6 Spielern an einem Gerät. Gib das Gerät nach jedem Zug weiter, damit niemand deine verdeckten Karten sieht.',
    players: 'Mitspieler',
    start: 'Partie starten',
    default_player: 'Spieler {{n}}',
  },
  rules: {
    title: 'Regeln in Kürze',
    draw: 'Ziehe eine Karte vom Stapel oder nimm die oberste Karte der Ablage. Dann tauschst du sie gegen eine deiner Karten oder legst sie ab. Statt zu ziehen kannst du Cabo rufen.',
    powers:
      'Ablegen einer 7 oder 8: eine eigene Karte ansehen. 9 oder 10: eine Karte eines Mitspielers ansehen. J oder Q: eine eigene und eine fremde Karte blind tauschen. Die Kraft ist optional und gilt nur für direkt vom Stapel abgelegte Karten.',
    cabo: 'Wer Cabo ruft, beendet die Runde: Alle anderen spielen noch einen letzten Zug. Hat der Rufer nicht die niedrigste Hand, bekommt er 10 Strafpunkte.',
    scoring:
      'Punkte: A=1, 2–10 Augenzahl, J=11, Q=12, schwarzer König=13, roter König und Joker=0. Die Partie endet, wenn ein Spieler 100 Punkte erreicht. Am wenigsten Punkte gewinnt.',
  },
  card: {
    face_down: 'Verdeckte Karte',
    joker: 'Joker',
  },
  table: {
    turn_of: 'Am Zug: {{name}}',
    cabo_called: 'Cabo gerufen von {{name}} – letzte Runde!',
    total: 'Punkte: {{score}}',
    draw_pile: 'Stapel ({{count}})',
    discard_pile: 'Ablage',
    drawn: 'Gezogen',
    own_hand: 'Deine Karten – {{name}} ({{score}} Punkte)',
  },
  hint: {
    turn: 'Ziehe eine Karte oder rufe Cabo.',
    must_swap: 'Diese Karte kam von der Ablage – du musst sie gegen eine eigene Karte tauschen.',
    swap_or_discard: 'Tippe eine eigene Karte an, um sie zu tauschen, oder lege die Karte ab.',
    power: {
      peek_own: 'Kraft: Tippe eine eigene Karte an, um sie anzusehen.',
      peek_other: 'Kraft: Tippe eine Karte eines Mitspielers an, um sie anzusehen.',
      blind_swap:
        'Kraft: Tippe zuerst eine eigene Karte an, dann eine fremde. Ohne hinzusehen tauschen.',
      blind_pick_other: 'Jetzt eine Karte eines Mitspielers antippen.',
    },
  },
  actions: {
    draw_deck: 'Vom Stapel ziehen',
    draw_discard: 'Von der Ablage nehmen',
    call_cabo: 'Cabo rufen',
    discard: 'Ablegen',
    skip_power: 'Kraft verzichten',
    next_round: 'Nächste Runde',
    restart: 'Neue Partie',
  },
  summary: {
    round_title: 'Runde {{n}} – Ergebnis',
    game_over: 'Partie beendet',
    winner: '{{names}} gewinnt!',
    caller_penalty: 'Cabo-Strafe: Der Rufer hatte nicht die niedrigste Hand (+10).',
    caller_ok: 'Cabo war erfolgreich: keine Strafe für den Rufer.',
    player: 'Spieler',
    hand: 'Hand',
    round: 'Runde',
    total: 'Gesamt',
  },
};

const en: typeof de = {
  title: 'Cabo',
  setup: {
    intro:
      'Cabo for 2–6 players on one device. Pass the device after every turn so nobody sees your face-down cards.',
    players: 'Players',
    start: 'Start game',
    default_player: 'Player {{n}}',
  },
  rules: {
    title: 'Rules in brief',
    draw: 'Draw a card from the deck or take the top card of the discard pile. Then swap it with one of your cards or discard it. Instead of drawing you may call Cabo.',
    powers:
      'Discarding a 7 or 8: look at one of your own cards. 9 or 10: look at one card of another player. J or Q: blind-swap one of your cards with one of another player’s without looking. Powers are optional and only apply to cards discarded straight from the deck.',
    cabo: 'Whoever calls Cabo ends the round: every other player gets one last turn. If the caller does not hold the lowest hand, they get 10 penalty points.',
    scoring:
      'Points: A=1, 2–10 face value, J=11, Q=12, black king=13, red king and joker=0. The game ends when a player reaches 100 points. Lowest total wins.',
  },
  card: {
    face_down: 'Face-down card',
    joker: 'Joker',
  },
  table: {
    turn_of: 'Turn: {{name}}',
    cabo_called: 'Cabo called by {{name}} – last round!',
    total: 'Score: {{score}}',
    draw_pile: 'Deck ({{count}})',
    discard_pile: 'Discard',
    drawn: 'Drawn',
    own_hand: 'Your cards – {{name}} ({{score}} points)',
  },
  hint: {
    turn: 'Draw a card or call Cabo.',
    must_swap: 'This card came from the discard pile – you must swap it with one of your cards.',
    swap_or_discard: 'Tap one of your cards to swap it, or discard the card.',
    power: {
      peek_own: 'Power: tap one of your cards to look at it.',
      peek_other: 'Power: tap one of another player’s cards to look at it.',
      blind_swap:
        'Power: first tap one of your cards, then one of another player’s. Swap without looking.',
      blind_pick_other: 'Now tap one of another player’s cards.',
    },
  },
  actions: {
    draw_deck: 'Draw from deck',
    draw_discard: 'Take from discard',
    call_cabo: 'Call Cabo',
    discard: 'Discard',
    skip_power: 'Skip power',
    next_round: 'Next round',
    restart: 'New game',
  },
  summary: {
    round_title: 'Round {{n}} – result',
    game_over: 'Game over',
    winner: '{{names}} wins!',
    caller_penalty: 'Cabo penalty: the caller did not hold the lowest hand (+10).',
    caller_ok: 'Cabo succeeded: no penalty for the caller.',
    player: 'Player',
    hand: 'Hand',
    round: 'Round',
    total: 'Total',
  },
};

let initialized = false;

/** Adds the Cabo bundles once i18next is ready (safe to call repeatedly). */
export const initCaboI18n = () => {
  if (initialized) return;
  const add = () => {
    if (initialized) return;
    initialized = true;
    i18next.addResourceBundle('de', 'translation', { games: { cabo: de } }, true, false);
    i18next.addResourceBundle('en', 'translation', { games: { cabo: en } }, true, false);
  };
  if (i18next.isInitialized) {
    add();
  } else {
    i18next.on('initialized', add);
  }
};
