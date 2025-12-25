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
                        "HUNTER": "Hunter",
                        "CUPID": "Cupid",
                        "LITTLE_GIRL": "Little Girl",
                        "DETECTIVE": "Detective",
                        "GUARDIAN": "Guardian",
                        "BLACK_CAT": "Black Cat",
                        "WISE": "Wise",
                        "BLACK_WEREWOLF": "Black Werewolf",
                        "WHITE_WEREWOLF": "White Werewolf",
                        "ANGEL": "Angel",
                        "EASTER_BUNNY": "Easter Bunny",
                        "WOLFDOG": "Wolfdog",
                        "RIPPER": "Ripper",
                        "SURVIVOR": "Survivor",
                        "PYROMANIAC": "Pyromaniac",
                        "THIEF": "Thief"
                    },
                    "role_descriptions": {
                        "VILLAGER": "An ordinary inhabitant of the village. You have no special powers during the night, but your voice is your weapon during the day. Work with others to find and eliminate the werewolves.",
                        "WEREWOLF": "A fearsome creature of the night. Each night, you and your pack choose one inhabitant to eliminate. During the day, you must blend in and hide your true nature.",
                        "SEER": "A mystic with the power of foresight. Each night, you can peer into the soul of one player to reveal their true role. Use this knowledge wisely to guide the village.",
                        "WITCH": "A master of alchemy. You possess two powerful potions: one that can save a victim from the werewolves, and another that can eliminate anyone you suspect. Each can be used only once.",
                        "HUNTER": "A skilled marksman with a vengeful spirit. If you are eliminated from the game, you can take one last shot and eliminate any other player of your choice.",
                        "CUPID": "The bringer of love and tragedy. On the very first night, you choose two players to become Lovers. Their fates are bound: if one dies, the other dies of a broken heart.",
                        "LITTLE_GIRL": "A brave child with curious eyes. During the night, while the werewolves choose their victim, you can peek and try to identify them. But beware: if they catch you looking, they will surely find you!",
                        "DETECTIVE": "A keen investigator. Each night, you can compare the alignment of two players to see if they belong to the same camp (Villagers vs. Werewolves). Excellent for finding the pack.",
                        "GUARDIAN": "A selfless protector. Each night, you choose one player to guard against the werewolves. They cannot be eliminated tonight. You may protect yourself, but never the same person twice in a row.",
                        "BLACK_CAT": "A creature of misfortune. You can curse a player, making their voice carry more weight in votes against them. Use this to help the village focus on a suspect.",
                        "WISE": "An elder with ancient resilience. You are so sturdy that you can survive the first attack from the werewolves. However, a second attack will be your end.",
                        "BLACK_WEREWOLF": "An alpha of the pack. Once per game, you can choose to infect a werewolf's victim instead of killing them. They will join your pack and fight alongside you.",
                        "WHITE_WEREWOLF": "A lonely renegade. You are a werewolf, but your goal is to be the last one standing. Each night, you wake up separately to eliminate another werewolf from the pack.",
                        "ANGEL": "A celestial being seeking a quick exit. Your goal is to be eliminated during the very first voting phase. If you succeed, you win the game instantly.",
                        "EASTER_BUNNY": "A mysterious visitor with gifts. Each night, you give eggs to two players. If you manage to give an egg to every living player in the village, you win alone.",
                        "WOLFDOG": "A hybrid role that chooses their loyalty on the first night. They can join the Villagers and use their unique perspective to catch werewolves, or join the Werewolves and hunt with the pack.",
                        "RIPPER": "A cold-blooded serial killer. You belong to no pack. Each night, you act alone to eliminate one player of your choice. Your goal is to be the only survivor.",
                        "SURVIVOR": "A resilient loner. You have the ability to protect yourself from death up to two times. Use your shields wisely to outlast the chaos and see the morning.",
                        "PYROMANIAC": "A destructive arsonist. Each night, you can oil two players. Later, you can choose to ignite the oil, eliminating all oiled players in a single night.",
                        "THIEF": "A cunning opportunist. On the first night, you can steal the identity and powers of another player. They will become an ordinary villager, while you take their place."
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
                        "add_players_hint": "Add at least 3 players to start.",
                        "select_roles_hint": "Select roles to include:",
                        "too_many_roles": "Too many roles selected for the number of players!",
                        "witch": {
                            "save_player": "The werewolves have struck. Will you use your healing potion to grant {{name}} a second chance at life?",
                            "select_kill": "The night is quiet... too quiet. Will you use your poison to eliminate someone you suspect of evil?",
                            "use_heal": "Use Healing Potion",
                            "use_kill": "Use Kill Potion"
                        },
                        "seer": {
                            "instruction": "Close your eyes and focus. Whose soul shall we peer into tonight to reveal their true nature?"
                        },
                        "cupid": {
                            "instruction": "Love is in the air, but it carries a heavy price. Choose two souls whose hearts shall be bound together forever."
                        },
                        "detective": {
                            "instruction": "A mystery unfolded. Select two players and I will tell you if their loyalties lie within the same camp."
                        },
                        "guardian": {
                            "instruction": "The shadows are lengthening. Whom will you stand watch over tonight to ensure they survive until morning?"
                        },
                        "black_werewolf": {
                            "instruction": "Your power is ancient. Choose a victim to infect with the curse of the moon, making them a brother of the pack."
                        },
                        "white_werewolf": {
                            "instruction": "Even among monsters, there is no trust. Choose one of your own kind to eliminate from this world."
                        },
                        "easter_bunny": {
                            "instruction": "Spring is coming. Select two players to receive your mysterious eggs. Your ultimate gift is almost ready."
                        },
                        "wolfdog": {
                            "instruction": "The first night is your time of choice. Do you remain loyal to the Village that raised you, or do you embrace your wild side and join the Werewolf pack?",
                            "villager": "Villager",
                            "werewolf": "Werewolf"
                        },
                        "ripper": {
                            "instruction": "The blade is sharp and the night is long. Choose your next victim to feel the cold steel of the Ripper."
                        },
                        "survivor": {
                            "instruction": "You walk a dangerous path alone. Will you activate your protection to shield yourself from the terrors of the night?",
                            "use_protection": "Protect Myself ({{count}} left)"
                        },
                        "pyromaniac": {
                            "instruction_oil": "With every drop of oil, a fire is prepared. Select two players to mark for a future blaze.",
                            "instruction_burn": "The stage is set. Shall we strike the match and watch the village burn with all your oiled targets?",
                            "burn_action": "Burn them all!",
                            "oil_action": "Oil Players"
                        },
                        "thief": {
                            "instruction": "A life of comfort or a life of power? Choose whose existence you will seize for yourself tonight."
                        },
                        "little_girl": {
                            "instruction": "A brave child with curious eyes. During the night, while the werewolves choose their victim, you can peek and try to identify them. But beware: if they catch you looking, they will surely find you!"
                        },
                        "lovers": {
                            "label": "Lovers"
                        }
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
                    "winner_label": "Winner: {{winner}}",
                    "werewolves_win": "The Werewolves Win!",
                    "villagers_win": "The Villagers Win!",
                    "play_again": "Play Again"
                }
            },
            "common": {
                "start": "Start Game",
                "back": "Back",
                "next": "Next",
                "players": "Players",
                "yes": "Yes",
                "no": "No",
                "skip": "Skip"
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
                        "HUNTER": "Jäger",
                        "CUPID": "Amor",
                        "LITTLE_GIRL": "Blinzelndes Mädchen",
                        "DETECTIVE": "Detektiv",
                        "GUARDIAN": "Beschützer",
                        "BLACK_CAT": "Schwarze Katze",
                        "WISE": "Der Weise",
                        "BLACK_WEREWOLF": "Schwarzer Werwolf",
                        "WHITE_WEREWOLF": "Weißer Werwolf",
                        "ANGEL": "Engel",
                        "EASTER_BUNNY": "Osterhase",
                        "WOLFDOG": "Wolfshund",
                        "RIPPER": "Ripper",
                        "SURVIVOR": "Überlebender",
                        "PYROMANIAC": "Pyromane",
                        "THIEF": "Dieb"
                    },
                    "role_descriptions": {
                        "VILLAGER": "Ein gewöhnlicher Bewohner des Dorfes. Du hast in der Nacht keine besonderen Kräfte, aber deine Stimme ist deine Waffe am Tag. Arbeite mit anderen zusammen, um die Werwölfe zu fangen und zu eliminieren.",
                        "WEREWOLF": "Eine furchterregende Kreatur der Nacht. Jede Nacht wählst du mit deinem Rudel einen Bewohner aus, der eliminiert werden soll. Am Tag musst du dich anpassen und deine wahre Natur verbergen.",
                        "SEER": "Ein Mystiker mit der Gabe der Vorhersehung. Jede Nacht kannst du in die Seele eines Spielers blicken, um seine wahre Rolle zu erfahren. Nutze dieses Wissen weise, um das Dorf zu führen.",
                        "WITCH": "Eine Meisterin der Alchemie. Du besitzt zwei mächtige Tränke: einen, der ein Opfer der Werwölfe retten kann, und einen weiteren, der jeden Verdächtigen eliminieren kann. Jeder kann nur einmal verwendet werden.",
                        "HUNTER": "Ein erfahrener Schütze mit einem rachsüchtigen Geist. Wenn du aus dem Spiel ausscheidest, kannst du einen letzten Schuss abgeben und einen anderen Spieler deiner Wahl mitnehmen.",
                        "CUPID": "Der Überbringer von Liebe und Tragödie. In der allerersten Nacht wählst du zwei Spieler aus, die zum Liebespaar werden. Ihr Schicksal ist verbunden: Stirbt einer, stirbt der andere an gebrochenem Herzen.",
                        "LITTLE_GIRL": "Ein mutiges Kind mit neugierigen Augen. In der Nacht, während die Werwölfe ihr Opfer wählen, darfst du blinzeln und versuchen, sie zu identifizieren. Aber Vorsicht: Wenn sie dich beim Gucken erwischen, werden sie dich sicher finden!",
                        "DETECTIVE": "Ein scharfsinniger Ermittler. Jede Nacht kannst du die Gesinnung zweier Spieler vergleichen, um zu sehen, ob sie zum selben Team gehören (Dorfbewohner vs. Werwölfe). Exzellent, um das Rudel zu finden.",
                        "GUARDIAN": "Ein selbstloser Beschützer. Jede Nacht wählst du einen Spieler aus, den du vor den Werwölfen bewachst. Er kann heute Nacht nicht eliminiert werden. Du darfst dich selbst schützen, aber niemals dieselbe Person zweimal hintereinander.",
                        "BLACK_CAT": "Eine Kreatur des Unglücks. Du kannst einen Spieler verfluchen, sodass seine Stimme bei Abstimmungen gegen ihn schwerer wiegt. Nutze dies, um dem Dorf zu helfen, sich auf einen Verdächtigen zu konzentrieren.",
                        "WISE": "Ein Ältester mit uralter Widerstandskraft. Du bist so robust, dass du den ersten Angriff der Werwölfe überleben kannst. Ein zweiter Angriff wird jedoch dein Ende sein.",
                        "BLACK_WEREWOLF": "Ein Alpha des Rudels. Einmal pro Spiel kannst du wählen, das Opfer der Werwölfe zu infizieren, anstatt es zu töten. Es wird sich deinem Rudel anschließen und an deiner Seite kämpfen.",
                        "WHITE_WEREWOLF": "Ein einsamer Abtrünniger. Du bist ein Werwolf, aber dein Ziel ist es, der letzte Überlebende zu sein. Jede Nacht erwachst du separat, um einen anderen Werwolf aus dem Rudel zu eliminieren.",
                        "ANGEL": "Ein himmlisches Wesen, das einen schnellen Abgang sucht. Dein Ziel ist es, in der allerersten Abstimmungsphase eliminiert zu werden. Wenn dir das gelingt, gewinnst du das Spiel sofort.",
                        "EASTER_BUNNY": "Ein mysteriöser Besucher mit Geschenken. Jede Nacht gibst du zwei Spielern Eier. Wenn es dir gelingt, jedem lebenden Spieler im Dorf ein Ei zu geben, gewinnst du allein.",
                        "WOLFDOG": "Eine Hybrid-Rolle, die in der ersten Nacht ihre Loyalität wählt. Sie können sich den Dorfbewohnern anschließen und ihre einzigartige Perspektive nutzen, um Werwölfe zu fangen, oder sich den Werwölfen anschließen und mit dem Rudel jagen.",
                        "RIPPER": "Ein kaltblütiger Serienmörder. Du gehörst keinem Rudel an. Jede Nacht handelst du allein, um einen Spieler deiner Wahl zu eliminieren. Dein Ziel ist es, der einzige Überlebende zu sein.",
                        "SURVIVOR": "Ein zäher Einzelgänger. Du hast die Fähigkeit, dich bis zu zweimal vor dem Tod zu schützen. Setze deine Schilde weise ein, um das Chaos zu überdauern und den Morgen zu erleben.",
                        "PYROMANIAC": "Ein zerstörerischer Brandstifter. Jede Nacht kannst du zwei Spieler einölen. Später kannst du wählen, das Öl zu entzünden und alle eingeölten Spieler in einer einzigen Nacht zu eliminieren.",
                        "THIEF": "Ein hinterlistiger Opportunist. In der ersten Nacht kannst du die Identität und Kräfte eines anderen Spielers stehlen. Er wird zu einem gewöhnlichen Dorfbewohner, während du seinen Platz einnimmst."
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
                        "add_players_hint": "Füge mindestens 3 Spieler hinzu.",
                        "select_roles_hint": "Wähle die Rollen für das Spiel:",
                        "too_many_roles": "Zu viele Rollen für die Anzahl der Spieler ausgewählt!",
                        "witch": {
                            "save_player": "Die Werwölfe haben zugeschlagen. Wirst du deinen Heiltrank nutzen, um {{name}} eine zweite Chance auf ein Leben zu gewähren?",
                            "select_kill": "Die Nacht ist ruhig... zu ruhig. Wirst du dein Gift nutzen, um jemanden zu eliminieren, den du des Bösen verdächtigst?",
                            "use_heal": "Heiltrank nutzen",
                            "use_kill": "Gifttrank nutzen"
                        },
                        "seer": {
                            "instruction": "Schließe deine Augen und konzentriere dich. In wessen Seele sollen wir heute Nacht blicken, um ihre wahre Natur zu enthüllen?"
                        },
                        "cupid": {
                            "instruction": "Liebe liegt in der Luft, aber sie fordert einen hohen Preis. Wähle zwei Seelen, deren Herzen für immer miteinander verbunden sein sollen."
                        },
                        "detective": {
                            "instruction": "Ein Geheimnis hat sich entfaltet. Wähle zwei Spieler und ich werde dir sagen, ob ihre Loyalität dem gleichen Lager gilt."
                        },
                        "guardian": {
                            "instruction": "Die Schatten werden länger. Wen wirst du heute Nacht bewachen, um sicherzustellen, dass er bis zum Morgen überlebt?"
                        },
                        "black_werewolf": {
                            "instruction": "Deine Macht ist uralt. Wähle ein Opfer, um es mit dem Fluch des Mondes zu infizieren und zu einem Bruder des Rudels zu machen."
                        },
                        "white_werewolf": {
                            "instruction": "Selbst unter Monstern gibt es kein Vertrauen. Wähle einen deiner eigenen Art aus, um ihn aus dieser Welt zu tilgen."
                        },
                        "easter_bunny": {
                            "instruction": "Der Frühling naht. Wähle zwei Spieler aus, die deine geheimnisvollen Eier erhalten sollen. Dein ultimatives Geschenk ist fast bereit."
                        },
                        "wolfdog": {
                            "instruction": "In dieser ersten Nacht musst du dich entscheiden. Bleibst du dem Dorf treu, das dich aufgezogen hat, oder gibst du deiner wilden Seite nach und schließt dich dem Rudel der Werwölfe an?",
                            "villager": "Dorfbewohner",
                            "werewolf": "Werwolf"
                        },
                        "ripper": {
                            "instruction": "Die Klinge ist scharf und die Nacht ist lang. Wähle dein nächstes Opfer, das den kalten Stahl des Rippers spüren soll."
                        },
                        "survivor": {
                            "instruction": "Du gehst allein einen gefährlichen Weg. Wirst du deinen Schutz aktivieren, um dich vor den Schrecken der Nacht abzuschirmen?",
                            "use_protection": "Selbstschutz ({{count}} übrig)"
                        },
                        "pyromaniac": {
                            "instruction_oil": "Mit jedem Tropfen Öl wird ein Feuer vorbereitet. Wähle zwei Spieler aus, um sie für einen zukünftigen Brand zu markieren.",
                            "instruction_burn": "Die Bühne ist bereit. Sollen wir das Zündholz anreißen und zusehen, wie das Dorf mit all deinen Zielen brennt?",
                            "burn_action": "Alle verbrennen!",
                            "oil_action": "Spieler einölen"
                        },
                        "thief": {
                            "instruction": "Ein Leben in Bequemlichkeit oder ein Leben in Macht? Wähle, wessen Existenz du heute Nacht für dich beanspruchen wirst."
                        },
                        "little_girl": {
                            "instruction": "Ein mutiges Kind mit neugierigen Augen. In der Nacht, während die Werwölfe ihr Opfer wählen, darfst du blinzeln und versuchen, sie zu identifizieren. Aber Vorsicht: Wenn sie dich beim Gucken erwischen, werden sie dich sicher finden!"
                        },
                        "lovers": {
                            "label": "Liebespaar"
                        }
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
                    "winner_label": "Gewinner: {{winner}}",
                    "werewolves_win": "Die Werwölfe gewinnen!",
                    "villagers_win": "Die Dorfbewohner gewinnen!",
                    "play_again": "Nochmal spielen"
                }
            },
            "common": {
                "start": "Spiel starten",
                "back": "Zurück",
                "next": "Weiter",
                "players": "Spieler",
                "yes": "Ja",
                "no": "Nein",
                "skip": "Überspringen"
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
