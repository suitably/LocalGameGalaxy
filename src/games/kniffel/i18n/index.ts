import i18next from 'i18next';

let kniffelI18nInitialized = false;

export const initKniffelI18n = () => {
  if (kniffelI18nInitialized) return;

  const add = () => {
    kniffelI18nInitialized = true;
    i18next.addResourceBundle(
      'de',
      'translation',
      {
        games: {
          kniffel: {
            title: 'Kniffel',
            description:
              'Der Klassiker unter den Würfelspielen. Sammle Punkte durch geschicktes Kombinieren von 5 Würfeln.',
            roll: 'Würfeln',
            show_dice: 'Würfel anzeigen',
            hide_dice: 'Würfel ausblenden',
            show_dice_tooltip: 'Virtuelle Würfel ein-/ausblenden',
            undo_tooltip: 'Letzten Eintrag rückgängig machen',
            rolling: 'Würfelt...',
            new_game: 'Neues Spiel',
            new_game_confirm:
              'Möchtest du wirklich eine neue Runde starten? Der aktuelle Spielstand geht verloren.',
            upper_section: 'Oberer Teil',
            lower_section: 'Unterer Teil',
            subtotal: 'Zwischensumme',
            bonus: 'Bonus ab 63',
            upper_total: 'Summe oben',
            lower_total: 'Summe unten',
            game_over: 'Spiel beendet!',
            play_again: 'Nochmal spielen',
            room_connecting: 'Verbinde mit dem Host …',
            room_your_turn: 'Du bist dran: würfeln und eintragen',
            room_turn_of: '{{name}} ist dran',
            room_playing_for: 'Du spielst für {{name}}',
            rules_label: 'Regeln',
            rules_kniffel: 'Kniffel',
            rules_international: 'International',
            rules_hint:
              'International: weitere Kniffel zählen 100 und als Joker für Full House und Straßen.',
            points: 'Punkte eintragen',
            strike: 'Streichen (0)',
            cat: {
              ones: 'Einser',
              twos: 'Zweier',
              threes: 'Dreier',
              fours: 'Vierer',
              fives: 'Fünfer',
              sixes: 'Sechser',
              three_of_a_kind: 'Dreierpasch',
              four_of_a_kind: 'Viererpasch',
              full_house: 'Full House',
              small_straight: 'Kleine Straße',
              large_straight: 'Große Straße',
              kniffel: 'Kniffel',
              chance: 'Chance',
              kniffel_bonus: 'Kniffel-Bonus',
            },
            hint: {
              ones: 'Summe aller Einsen',
              twos: 'Summe aller Zweien',
              threes: 'Summe aller Dreien',
              fours: 'Summe aller Vieren',
              fives: 'Summe aller Fünfen',
              sixes: 'Summe aller Sechsen',
              three_of_a_kind: 'Alle Augen zählen',
              four_of_a_kind: 'Alle Augen zählen',
              full_house: '3 + 2 gleiche · 25',
              small_straight: '4 in Folge · 30',
              large_straight: '5 in Folge · 40',
              kniffel: '5 gleiche · 50',
              chance: 'Alle Augen zählen',
              kniffel_bonus: 'Jeder weitere · {{points}}',
            },
          },
        },
      },
      true,
      false,
    );
    i18next.addResourceBundle(
      'en',
      'translation',
      {
        games: {
          kniffel: {
            title: 'Yahtzee',
            description: 'The classic dice game. Score points by cleverly combining 5 dice.',
            roll: 'Roll',
            show_dice: 'Show dice',
            hide_dice: 'Hide dice',
            show_dice_tooltip: 'Show or hide virtual dice',
            undo_tooltip: 'Undo last entry',
            rolling: 'Rolling...',
            new_game: 'New Game',
            new_game_confirm:
              'Do you really want to start a new round? Current game progress will be lost.',
            upper_section: 'Upper Section',
            lower_section: 'Lower Section',
            subtotal: 'Subtotal',
            bonus: 'Bonus (63+)',
            upper_total: 'Upper Total',
            lower_total: 'Lower Total',
            game_over: 'Game Over!',
            play_again: 'Play Again',
            room_connecting: 'Connecting to the host …',
            room_your_turn: 'Your turn: roll and score',
            room_turn_of: "It's {{name}}'s turn",
            room_playing_for: 'You are playing for {{name}}',
            rules_label: 'Rules',
            rules_kniffel: 'Kniffel',
            rules_international: 'International',
            rules_hint:
              'International: further five of a kinds score 100 and are jokers for Full House and straights.',
            points: 'Score Points',
            strike: 'Strike (0)',
            cat: {
              ones: 'Ones',
              twos: 'Twos',
              threes: 'Threes',
              fours: 'Fours',
              fives: 'Fives',
              sixes: 'Sixes',
              three_of_a_kind: '3 of a Kind',
              four_of_a_kind: '4 of a Kind',
              full_house: 'Full House',
              small_straight: 'Small Straight',
              large_straight: 'Large Straight',
              kniffel: 'Yahtzee',
              chance: 'Chance',
              kniffel_bonus: 'Yahtzee Bonus',
            },
            hint: {
              ones: 'Sum of all Ones',
              twos: 'Sum of all Twos',
              threes: 'Sum of all Threes',
              fours: 'Sum of all Fours',
              fives: 'Sum of all Fives',
              sixes: 'Sum of all Sixes',
              three_of_a_kind: 'Sum of all dice',
              four_of_a_kind: 'Sum of all dice',
              full_house: '3 + 2 of a kind · 25',
              small_straight: '4 in a row · 30',
              large_straight: '5 in a row · 40',
              kniffel: '5 of a kind · 50',
              chance: 'Sum of all dice',
              kniffel_bonus: 'Each additional · {{points}}',
            },
          },
        },
      },
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
