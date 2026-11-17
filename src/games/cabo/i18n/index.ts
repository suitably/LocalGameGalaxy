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
    memory_aid: 'Gedächtnishilfe',
    memory_aid_hint:
      'Gesehene Karten bleiben für dich offen liegen. Leichter, aber ohne das Merken, um das es bei Cabo eigentlich geht.',
  },
  rules: {
    title: 'Regeln in Kürze',
    peek: 'Zu Beginn jeder Runde schaust du dir einmal deine beiden unteren Karten an und merkst sie dir. Danach liegen alle Karten verdeckt.',
    draw: 'Ziehe eine Karte vom Stapel oder nimm die oberste Karte der Ablage. Dann tauschst du sie gegen eine deiner Karten oder legst sie ab. Statt zu ziehen kannst du Cabo rufen.',
    powers:
      'Ablegen einer 7 oder 8: eine eigene Karte ansehen. 9 oder 10: eine Karte eines Mitspielers ansehen. J oder Q: eine eigene und eine fremde Karte blind tauschen. Die Kraft ist optional und gilt nur für direkt vom Stapel abgelegte Karten.',
    cabo: 'Wer Cabo ruft, beendet die Runde: Alle anderen spielen noch einen letzten Zug. Hat der Rufer nicht die niedrigste Hand, bekommt er 10 Strafpunkte.',
    scoring:
      'Punkte: A=1, 2–10 Augenzahl, J=11, Q=12, schwarzer König=13, roter König und Joker=0. Wer genau 100 Punkte erreicht, fällt auf 50 zurück. Die Partie endet, sobald jemand über 100 liegt. Am wenigsten Punkte gewinnt.',
    variants: 'Nicht enthalten: Ablegen außer der Reihe („Snap“).',
  },
  card: {
    slot: 'Karte {{n}} von {{name}}',
    own_slot: 'Deine Karte {{n}}',
  },
  table: {
    turn_of: 'Am Zug: {{name}}',
    cabo_called: 'Cabo gerufen von {{name}} – letzte Runde!',
    total: 'Punkte: {{score}}',
    cabo_chip: 'Cabo',
    draw_pile: 'Stapel ({{count}})',
    discard_pile: 'Ablage',
    drawn: 'Gezogen',
    own_hand: 'Deine Karten – {{name}} ({{score}} Punkte)',
  },
  hint: {
    turn: 'Ziehe eine Karte oder rufe Cabo.',
    start_peek: 'Merk dir deine beiden unteren Karten – danach werden sie wieder verdeckt.',
    reveal: 'Merk dir die Karte. Danach endet dein Zug.',
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
    got_it: 'Gemerkt',
    end_turn: 'Fertig – Zug beenden',
    next_round: 'Nächste Runde',
    restart: 'Neue Partie',
  },
  summary: {
    round_title: 'Runde {{n}} – Ergebnis',
    game_over: 'Partie beendet',
    winner: '{{names}} gewinnt!',
    caller_penalty: 'Cabo-Strafe: Der Rufer hatte nicht die niedrigste Hand (+10).',
    caller_ok: 'Cabo war erfolgreich: keine Strafe für den Rufer.',
    reset_to_half: '{{names}}: genau 100 Punkte – zurück auf 50!',
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
    memory_aid: 'Memory aid',
    memory_aid_hint:
      'Cards you have seen stay face up for you. Easier, but it removes the remembering that Cabo is about.',
  },
  rules: {
    title: 'Rules in brief',
    peek: 'At the start of every round you look at your two bottom cards once and memorise them. After that, all cards lie face down.',
    draw: 'Draw a card from the deck or take the top card of the discard pile. Then swap it with one of your cards or discard it. Instead of drawing you may call Cabo.',
    powers:
      'Discarding a 7 or 8: look at one of your own cards. 9 or 10: look at one card of another player. J or Q: blind-swap one of your cards with one of another player’s without looking. Powers are optional and only apply to cards discarded straight from the deck.',
    cabo: 'Whoever calls Cabo ends the round: every other player gets one last turn. If the caller does not hold the lowest hand, they get 10 penalty points.',
    scoring:
      'Points: A=1, 2–10 face value, J=11, Q=12, black king=13, red king and joker=0. A total of exactly 100 falls back to 50. The game ends once someone is above 100. Lowest total wins.',
    variants: 'Not included: discarding out of turn ("snap").',
  },
  card: {
    slot: 'Card {{n}} of {{name}}',
    own_slot: 'Your card {{n}}',
  },
  table: {
    turn_of: 'Turn: {{name}}',
    cabo_called: 'Cabo called by {{name}} – last round!',
    total: 'Score: {{score}}',
    cabo_chip: 'Cabo',
    draw_pile: 'Deck ({{count}})',
    discard_pile: 'Discard',
    drawn: 'Drawn',
    own_hand: 'Your cards – {{name}} ({{score}} points)',
  },
  hint: {
    turn: 'Draw a card or call Cabo.',
    start_peek: 'Memorise your two bottom cards – they will be turned face down again.',
    reveal: 'Memorise the card. Your turn ends after this.',
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
    got_it: 'Got it',
    end_turn: 'Done – end turn',
    next_round: 'Next round',
    restart: 'New game',
  },
  summary: {
    round_title: 'Round {{n}} – result',
    game_over: 'Game over',
    winner: '{{names}} wins!',
    caller_penalty: 'Cabo penalty: the caller did not hold the lowest hand (+10).',
    caller_ok: 'Cabo succeeded: no penalty for the caller.',
    reset_to_half: '{{names}}: exactly 100 points – back to 50!',
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
