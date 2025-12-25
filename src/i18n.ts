import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
    en: {
        translation: {
            "app": {
                "title": "Local Game Galaxy",
                "welcome": "Welcome to the Hub"
            },
            "games": {
                "werewolf": {
                    "title": "Werewolf",
                    "description": "A game of deception and deduction.",
                    "role_reveal": "Role Reveal",
                    "pass_device_instruction": "Pass device to {{name}}",
                    "reveal_role": "Reveal Role",
                    "start_night": "Start Night",
                    "roles": {
                        "VILLAGER": "Villager",
                        "WEREWOLF": "Werewolf",
                        "SEER": "Seer",
                        "WITCH": "Witch",
                        "HUNTER": "Hunter"
                    },
                    "role_descriptions": {
                        "VILLAGER": "Find and eliminate the werewolves.",
                        "WEREWOLF": "Eliminate the villagers at night.",
                        "SEER": "Each night, look at one player's card.",
                        "WITCH": "You have one healing and one poison potion.",
                        "HUNTER": "If you die, take someone with you."
                    },
                    "narrator": {
                        "night_start": "Night falls. Everyone close your eyes.",
                        "werewolves_wake": "Werewolves, wake up.",
                        "werewolves_sleep": "Werewolves, go back to sleep.",
                        "day_start": "The sun rises. Everyone wake up!",
                        "day_intro": "It is a new day.",
                        "died_night": "{{names}} died last night.",
                        "noone_died": "No one died last night.",
                        "morning_coming": "Morning is coming...",
                        "dashboard_title": "Narrator Dashboard (Night {{round}})",
                        "wait_for_werewolves": "Wait for Werewolves to decide...",
                        "werewolves_label": "Werewolves:",
                        "select_victim": "Select Victim:",
                        "skip_to_morning": "Skip to Morning",
                        "night_label": "Night {{round}}",
                        "day_label": "Day {{round}}"
                    },
                    "ui": {
                        "died_last_night": "Died last night:",
                        "peaceful_night": "Peaceful night.",
                        "start_vote": "Start Voting / End Day",
                        "narrator_mode": "Dedicated Narrator",
                        "narrator_select": "Who is the Narrator?",
                        "tap_to_act": "TAP TO ACT",
                        "hide_screen": "Hide Screen",
                        "pass_to_werewolf": "Pass phone to any Werewolf or place in middle.",
                        "player_name": "Player Name",
                        "add": "Add",
                        "add_players_hint": "Add at least 3 players to start."
                    },
                    "continue": {
                        "title": "Continue Game?",
                        "message": "A saved game was found. Would you like to continue or start a new game?",
                        "round": "Round {{round}}",
                        "phase": "Phase: {{phase}}",
                        "players": "{{count}} players",
                        "continue_game": "Continue",
                        "new_game": "New Game"
                    },
                    "voting": {
                        "title": "Village Vote (Day {{round}})",
                        "select_player": "Who should be eliminated?",
                        "instruction": "Tap on the player the village wants to eliminate.",
                        "skip": "Skip Vote / No Elimination"
                    },
                    "game_over": "Game Over",
                    "werewolves_win": "The Werewolves Win!",
                    "villagers_win": "The Villagers Win!",
                    "play_again": "Play Again"
                }
            },
            "common": {
                "start": "Start Game",
                "back": "Back",
                "next": "Next",
                "players": "Players"
            }
        }
    },
    de: {
        translation: {
            "app": {
                "title": "Lokale Spiele Galaxy",
                "welcome": "Willkommen im Hub"
            },
            "games": {
                "werewolf": {
                    "title": "Werwolf",
                    "description": "Ein Spiel um Täuschung und Deduktion.",
                    "role_reveal": "Rollenverteilung",
                    "pass_device_instruction": "Gerät an {{name}} geben",
                    "reveal_role": "Rolle aufdecken",
                    "start_night": "Nacht starten",
                    "roles": {
                        "VILLAGER": "Dorfbewohner",
                        "WEREWOLF": "Werwolf",
                        "SEER": "Seherin",
                        "WITCH": "Hexe",
                        "HUNTER": "Jäger"
                    },
                    "role_descriptions": {
                        "VILLAGER": "Finde und eliminiere die Werwölfe.",
                        "WEREWOLF": "Eliminiere nachts die Dorfbewohner.",
                        "SEER": "Sieh dir jede Nacht eine Karte an.",
                        "WITCH": "Du hast einen Heil- und einen Gifttrank.",
                        "HUNTER": "Wenn du stirbst, nimm jemanden mit."
                    },
                    "narrator": {
                        "night_start": "Die Nacht bricht herein. Alle schließen die Augen.",
                        "werewolves_wake": "Werwölfe, erwacht.",
                        "werewolves_sleep": "Werwölfe, schlaft wieder ein.",
                        "day_start": "Die Sonne geht auf. Alle erwachen!",
                        "day_intro": "Es ist ein neuer Tag.",
                        "died_night": "{{names}} ist/sind gestorben.",
                        "noone_died": "Niemand ist gestorben.",
                        "morning_coming": "Der Morgen naht...",
                        "dashboard_title": "Erzähler-Dashboard (Nacht {{round}})",
                        "wait_for_werewolves": "Warte auf die Entscheidung der Werwölfe...",
                        "werewolves_label": "Werwölfe:",
                        "select_victim": "Opfer auswählen:",
                        "skip_to_morning": "Zum Morgen springen",
                        "night_label": "Nacht {{round}}",
                        "day_label": "Tag {{round}}"
                    },
                    "ui": {
                        "died_last_night": "Letzte Nacht gestorben:",
                        "peaceful_night": "Eine friedliche Nacht.",
                        "start_vote": "Abstimmung starten / Tag beenden",
                        "narrator_mode": "Menschlicher Erzähler",
                        "narrator_select": "Wer ist der Erzähler?",
                        "tap_to_act": "ANTIPPEN",
                        "hide_screen": "Verstecken",
                        "pass_to_werewolf": "Handy an einen Werwolf geben oder in die Mitte legen.",
                        "player_name": "Spielername",
                        "add": "Hinzufügen",
                        "add_players_hint": "Füge mindestens 3 Spieler hinzu."
                    },
                    "continue": {
                        "title": "Spiel fortsetzen?",
                        "message": "Ein gespeichertes Spiel wurde gefunden. Möchtest du fortfahren oder ein neues Spiel starten?",
                        "round": "Runde {{round}}",
                        "phase": "Phase: {{phase}}",
                        "players": "{{count}} Spieler",
                        "continue_game": "Fortsetzen",
                        "new_game": "Neues Spiel"
                    },
                    "voting": {
                        "title": "Dorfabstimmung (Tag {{round}})",
                        "select_player": "Wer soll eliminiert werden?",
                        "instruction": "Tippe auf den Spieler, den das Dorf eliminieren möchte.",
                        "skip": "Abstimmung überspringen / Keine Eliminierung"
                    },
                    "game_over": "Spiel vorbei",
                    "werewolves_win": "Die Werwölfe gewinnen!",
                    "villagers_win": "Die Dorfbewohner gewinnen!",
                    "play_again": "Nochmal spielen"
                }
            },
            "common": {
                "start": "Spiel starten",
                "back": "Zurück",
                "next": "Weiter",
                "players": "Spieler"
            }
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: "en",
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
