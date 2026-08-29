import i18next from 'i18next';

export const qwixxTranslations = {
    en: {
        games: {
            qwixx: {
                title: "Qwixx",
                description: "Tactical dice-rolling score sheet game. Cross numbers, lock rows, and maximize your score!",
                roll: "Roll",
                rolling: "Rolling...",
                white_sum: "White Sum (All)",
                red: "Red",
                yellow: "Yellow",
                green: "Green",
                blue: "Blue",
                misses: "Misses",
                misses_label: "Misses (-5):",
                total: "TOTAL",
                opponents: "Opponents",
                tap_to_view: "Tap to view full sheet",
                sheet: "Score Sheet",
                new_game: "New Game",
                reset_confirm: "Are you sure you want to reset your score sheet?",
                solo_mode: "Digital Sheet (Solo)",
                multiplayer_mode: "Multiplayer Room",
                room_code: "Room Code",
                share_room: "Share Room",
                join_room: "Join Room",
                create_room: "Create Room",
                player_name: "Player Name",
                dice_roller: "Dice Roller",
                show_dice: "Show Dice",
                hide_dice: "Hide Dice",
                tap_die_hint: "Tap a die to highlight crossable numbers"
            }
        }
    },
    de: {
        games: {
            qwixx: {
                title: "Qwixx",
                description: "Taktischer Würfel-Klassiker. Kreuze Zahlen von links nach rechts an, schließe Reihen ab und sammle die meisten Punkte!",
                roll: "Würfeln",
                rolling: "Würfelt...",
                white_sum: "Weiße Summe (Alle)",
                red: "Rot",
                yellow: "Gelb",
                green: "Grün",
                blue: "Blau",
                misses: "Fehlwürfe",
                misses_label: "Fehlwürfe (-5):",
                total: "GESAMT",
                opponents: "Mitspieler",
                tap_to_view: "Tippen für Details",
                sheet: "Qwixx-Zettel",
                new_game: "Neues Spiel",
                reset_confirm: "Möchtest du deinen Zettel wirklich zurücksetzen?",
                solo_mode: "Digitaler Block (Solo)",
                multiplayer_mode: "Mehrspieler-Raum",
                room_code: "Raum-Code",
                share_room: "Raum teilen",
                join_room: "Raum beitreten",
                create_room: "Raum erstellen",
                player_name: "Spielername",
                dice_roller: "Würfelbecher",
                show_dice: "Würfel anzeigen",
                hide_dice: "Würfel verbergen",
                tap_die_hint: "Tippe auf einen Würfel, um ankreuzbare Zahlen hervorzuheben"
            }
        }
    }
};

let qwixxI18nInitialized = false;

export const initQwixxI18n = () => {
    if (qwixxI18nInitialized) return;
    qwixxI18nInitialized = true;

    i18next.addResourceBundle('en', 'translation', qwixxTranslations.en, true, true);
    i18next.addResourceBundle('de', 'translation', qwixxTranslations.de, true, true);
};
