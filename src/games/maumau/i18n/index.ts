/**
 * Mau-Mau strings, German and English, added to the i18next store at module load [ID: UI-MAUMAU-I18N]
 */
import i18next from 'i18next';

const de = {
  title: 'Mau-Mau',
  setup: {
    intro:
      'Mau-Mau mit 2–5 Spielern an einem Gerät. Gib das Gerät nach jedem Zug weiter, damit niemand deine Karten sieht.',
    players: 'Mitspieler',
    start: 'Partie starten',
    default_player: 'Spieler {{n}}',
  },
  rules: {
    title: 'Regeln in Kürze',
    play: 'Lege eine Karte mit gleicher Farbe oder gleichem Wert wie die oberste Karte. Wer zuerst keine Karten mehr hat, gewinnt die Runde.',
    specials:
      '7: Der Nächste zieht 2 Karten – oder legt selbst eine 7 (dann 4 usw.). 8: Der Nächste setzt aus. Bube: auf alles außer auf einen Buben spielbar, du wünschst dir eine Farbe.',
    draw: 'Kannst du nicht oder willst du nicht legen, ziehst du eine Karte. Passt sie, darfst du sie sofort legen, sonst passt du. Danach darf nur die gezogene Karte gespielt werden.',
  },
  table: {
    turn_of: 'Am Zug: {{name}}',
    draw_pile: 'Stapel ({{count}})',
    discard_pile: 'Ablage',
    wish: 'Gewünschte Farbe',
    penalty: 'Strafe: {{count}} Karten ziehen oder mit einer 7 antworten.',
    cards: '{{count}} Karten',
    mau: 'Mau!',
    own_hand: 'Deine Karten – {{name}}',
    wins: '{{count}} Siege',
  },
  hint: {
    turn: 'Lege eine passende Karte oder ziehe.',
    drawn: 'Gezogen: Du darfst nur die gezogene Karte legen, sonst passt du.',
    drawn_empty: 'Es gibt keine Karte zum Ziehen. Du musst passen.',
    wish: 'Wünsche dir eine Farbe.',
  },
  suit: {
    hearts: 'Herz',
    diamonds: 'Karo',
    clubs: 'Kreuz',
    spades: 'Pik',
  },
  actions: {
    draw: 'Karte ziehen',
    take_penalty: 'Strafe ziehen ({{count}})',
    pass: 'Passen – Gerät weitergeben',
    next_round: 'Nächste Runde',
    restart: 'Neue Partie',
  },
  wish_dialog: {
    title: 'Farbe wünschen',
  },
  summary: {
    round_title: 'Runde {{n}} – Mau-Mau!',
    winner: '{{name}} gewinnt die Runde!',
    player: 'Spieler',
    cards_left: 'Restkarten',
    wins: 'Siege',
  },
};

const en: typeof de = {
  title: 'Mau-Mau',
  setup: {
    intro:
      'Mau-Mau for 2–5 players on one device. Pass the device after every turn so nobody sees your cards.',
    players: 'Players',
    start: 'Start game',
    default_player: 'Player {{n}}',
  },
  rules: {
    title: 'Rules in brief',
    play: 'Play a card of the same suit or the same rank as the top card. The first player with no cards left wins the round.',
    specials:
      '7: the next player draws 2 cards – or plays their own 7 (then 4, and so on). 8: the next player is skipped. Jack: playable on anything except a jack, and you wish a suit.',
    draw: 'If you cannot or do not want to play, draw one card. If it fits you may play it right away, otherwise you pass. After drawing only the drawn card may be played.',
  },
  table: {
    turn_of: 'Turn: {{name}}',
    draw_pile: 'Deck ({{count}})',
    discard_pile: 'Discard',
    wish: 'Wished suit',
    penalty: 'Penalty: draw {{count}} cards or answer with a 7.',
    cards: '{{count}} cards',
    mau: 'Mau!',
    own_hand: 'Your cards – {{name}}',
    wins: '{{count}} wins',
  },
  hint: {
    turn: 'Play a matching card or draw.',
    drawn: 'Drawn: you may only play the drawn card, otherwise pass.',
    drawn_empty: 'There is no card to draw. You have to pass.',
    wish: 'Wish a suit.',
  },
  suit: {
    hearts: 'Hearts',
    diamonds: 'Diamonds',
    clubs: 'Clubs',
    spades: 'Spades',
  },
  actions: {
    draw: 'Draw a card',
    take_penalty: 'Draw penalty ({{count}})',
    pass: 'Pass – hand over the device',
    next_round: 'Next round',
    restart: 'New game',
  },
  wish_dialog: {
    title: 'Wish a suit',
  },
  summary: {
    round_title: 'Round {{n}} – Mau-Mau!',
    winner: '{{name}} wins the round!',
    player: 'Player',
    cards_left: 'Cards left',
    wins: 'Wins',
  },
};

let initialized = false;

/** Adds the Mau-Mau bundles once i18next is ready (safe to call repeatedly). */
export const initMauMauI18n = () => {
  if (initialized) return;
  const add = () => {
    if (initialized) return;
    initialized = true;
    i18next.addResourceBundle('de', 'translation', { games: { maumau: de } }, true, false);
    i18next.addResourceBundle('en', 'translation', { games: { maumau: en } }, true, false);
  };
  if (i18next.isInitialized) {
    add();
  } else {
    i18next.on('initialized', add);
  }
};
