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
                    "narrator": {
                        "night_start": "Night falls. Everyone close your eyes.",
                        "werewolves_wake": "Werewolves, wake up.",
                        "werewolves_sleep": "Werewolves, go back to sleep.",
                        "day_start": "The sun rises. Everyone wake up!",
                        "day_intro": "It is a new day.",
                        "died_night": "{{names}} died last night.",
                        "noone_died": "No one died last night."
                    },
                    "ui": {
                        "died_last_night": "Died last night:",
                        "peaceful_night": "Peaceful night.",
                        "start_vote": "Start Voting / End Day"
                    }
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
                    "narrator": {
                        "night_start": "Die Nacht bricht herein. Alle schließen die Augen.",
                        "werewolves_wake": "Werwölfe, erwacht.",
                        "werewolves_sleep": "Werwölfe, schlaft wieder ein.",
                        "day_start": "Die Sonne geht auf. Alle erwachen!",
                        "day_intro": "Es ist ein neuer Tag.",
                        "died_night": "{{names}} ist/sind gestorben.",
                        "noone_died": "Niemand ist gestorben."
                    },
                    "ui": {
                        "died_last_night": "Letzte Nacht gestorben:",
                        "peaceful_night": "Eine friedliche Nacht.",
                        "start_vote": "Abstimmung starten / Tag beenden"
                    }
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
