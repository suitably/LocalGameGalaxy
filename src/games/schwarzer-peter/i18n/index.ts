/**
 * Schwarzer Peter strings, German and English, added to the i18next store at module load
 * [ID: UI-SP-I18N]
 */
import i18next from 'i18next';

const de = {
  title: 'Schwarzer Peter',
  setup: {
    intro:
      'Schwarzer Peter mit 2–6 Spielern an einem Gerät. Gib das Gerät nach jedem Zug weiter, damit niemand deine Karten sieht.',
    players: 'Mitspieler',
    start: 'Spiel starten',
    default_player: 'Spieler {{n}}',
  },
  rules: {
    title: 'Regeln in Kürze',
    pairs:
      'Gleiche Karten bilden ein Paar, wenn Wert und Farbe (rot oder schwarz) übereinstimmen. Paare werden sofort abgelegt. Pik-Bube ist der Schwarze Peter und bildet nie ein Paar.',
    turn: 'Wer dran ist, zieht eine verdeckte Karte vom nächsten Spieler im Uhrzeigersinn, der noch Karten hat. Passt sie zu einer eigenen Karte, wird das Paar abgelegt.',
    end: 'Wer keine Karten mehr hat, ist sicher. Am Ende bleibt nur der Schwarze Peter übrig – wer ihn hält, verliert die Runde.',
  },
  card: {
    face_down: 'Karte {{n}} von {{name}}',
  },
  table: {
    turn_of: 'Am Zug: {{name}}',
    deal_summary: 'Beim Austeilen abgelegt: {{count}} Paare',
    own_hand: 'Deine Karten – {{name}}',
    source: 'Ziehe eine Karte von {{name}}',
    cards_left: '{{count}} Karten',
    out: 'Raus',
    no_cards: 'Keine Karten',
  },
  hint: {
    pick: 'Tippe eine verdeckte Karte an, um sie zu ziehen.',
    drawn: 'Du hast gezogen:',
    pair_discarded: 'Passt zu deiner Karte {{card}} – das Paar wurde abgelegt.',
    no_pair: 'Kein Paar – die Karte bleibt auf deiner Hand.',
    done: 'Fertig – Gerät weitergeben',
  },
  summary: {
    round_title: 'Runde {{n}} – Ergebnis',
    loser: '{{name}} hält den Schwarzen Peter und verliert die Runde!',
    player: 'Spieler',
    losses: 'Niederlagen',
    next_round: 'Nächste Runde',
    new_game: 'Neues Spiel',
  },
};

const en = {
  title: 'Old Maid',
  setup: {
    intro:
      'Old Maid (Schwarzer Peter) for 2–6 players on one device. Pass the device on after every turn so nobody sees your cards.',
    players: 'Players',
    start: 'Start game',
    default_player: 'Player {{n}}',
  },
  rules: {
    title: 'Rules in short',
    pairs:
      'Two cards of the same rank and colour (red or black) form a pair and are discarded at once. The jack of spades is the Old Maid and never pairs.',
    turn: 'On your turn, draw one face-down card from the next player clockwise who still holds cards. If it matches one of yours, the pair is discarded.',
    end: 'Players without cards are safe. In the end only the Old Maid is left; its holder loses the round.',
  },
  card: {
    face_down: 'Card {{n}} of {{name}}',
  },
  table: {
    turn_of: 'Turn: {{name}}',
    deal_summary: 'Discarded at the deal: {{count}} pairs',
    own_hand: 'Your cards – {{name}}',
    source: 'Draw a card from {{name}}',
    cards_left: '{{count}} cards',
    out: 'Out',
    no_cards: 'No cards',
  },
  hint: {
    pick: 'Tap a face-down card to draw it.',
    drawn: 'You drew:',
    pair_discarded: 'It matches your card {{card}} – the pair was discarded.',
    no_pair: 'No pair – the card stays in your hand.',
    done: 'Done – pass the device on',
  },
  summary: {
    round_title: 'Round {{n}} – result',
    loser: '{{name}} holds the Old Maid and loses the round!',
    player: 'Player',
    losses: 'Losses',
    next_round: 'Next round',
    new_game: 'New game',
  },
};

let initialized = false;

/** Adds the Schwarzer Peter bundles once i18next is ready (safe to call repeatedly). */
export const initSchwarzerPeterI18n = () => {
  if (initialized) return;
  const add = () => {
    if (initialized) return;
    initialized = true;
    i18next.addResourceBundle(
      'de',
      'translation',
      { games: { 'schwarzer-peter': de } },
      true,
      false,
    );
    i18next.addResourceBundle(
      'en',
      'translation',
      { games: { 'schwarzer-peter': en } },
      true,
      false,
    );
  };
  if (i18next.isInitialized) {
    add();
  } else {
    i18next.on('initialized', add);
  }
};
