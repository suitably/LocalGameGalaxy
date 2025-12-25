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
                        "VILLAGER": "An ordinary inhabitant of the village. You have no special powers during the night, but your voice and your vote are your dual weapons during the day. Your goal is to work with others to identify, discuss, and eliminate all threats (Werewolves and other killers) to the village's peace.",
                        "WEREWOLF": "A fearsome shapeshifter. Each night, you wake up with your fellow werewolves to choose one villager to eliminate. During the day, you must act like an innocent villager to avoid execution. You win when you have eliminated enough villagers to equal your own numbers.",
                        "SEER": "A mystic with the power of foresight. Each night, you awaken alone and choose one player. The narrator will reveal that player's specific role card to you. Use this secret knowledge to guide the village's votes without making yourself an obvious target for the wolves.",
                        "WITCH": "A master of alchemy with two unique potions. Once per game, you can use your Healing Potion to save the player chosen by the werewolves. Once per game, you can use your Poison Potion to eliminate any player of your choice. You can use both potions in the same night.",
                        "HUNTER": "A skilled marksman. Your unique power only activates at the moment of your death. When you are eliminated (either by wolves or by the village vote), you must immediately choose one other player to take with you to the grave. They are eliminated instantly.",
                        "CUPID": "The bringer of love. On the very first night, you choose two players to become Lovers. You can even choose yourself. If one of the Lovers dies, the other immediately dies of a broken heart. Their alignment is bound together for the rest of the game.",
                        "LITTLE_GIRL": "A brave but fragile child. During the night phase when the werewolves are choosing their victim, you have the special permission to peek. If you successfully identify a wolf, the village gains a major advantage. However, if the wolves catch you looking, you will be eaten immediately.",
                        "DETECTIVE": "A keen investigator of alignments. Each night, you select two players. The narrator will tell you if they belong to the same camp (e.g., both are Villagers or both are Werewolves) or different camps. This is a powerful tool for mapping out the pack.",
                        "GUARDIAN": "A selfless protector. Each night, you choose one player to protect against the werewolves. That player cannot be eliminated by a werewolf attack tonight. You may protect yourself, but you cannot choose the same person two nights in a row.",
                        "BLACK_CAT": "A harbinger of bad luck. Each night, you can choose a player to curse. This player will implicitly receive an additional vote against them during the next day's village meeting, making it easier for the village to execute them.",
                        "WISE": "An elder with ancient resilience. You are so sturdy that you can survive the first successful attack from the werewolves. You will not die and life goes on. However, if the wolves (or another killer) attack you a second time, you will perish like anyone else.",
                        "BLACK_WEREWOLF": "The alpha of the pack. You are a regular werewolf, but you have one special gift: once per game, you can choose to infect the prey instead of killing them. The victim's role is replaced, and they join the werewolf pack secretly from that night forward.",
                        "WHITE_WEREWOLF": "A lonely renegade playing a dangerous double game. Each night, you wake up with the other werewolves to hunt together. However, once the pack sleeps, you wake up a second time alone to eliminate one of your fellow werewolves. You win only if you are the sole survivor.",
                        "ANGEL": "A celestial being seeking a quick exit. Your goal is unusual: you win the game instantly if you manage to get yourself eliminated during the very first day's voting session. If you survive past the first day, you become a regular villager without any powers.",
                        "EASTER_BUNNY": "A mysterious visitor with a secret mission. Each night, you give eggs to two players. Your goal is to give an egg to every single player currently alive in the village. If you achieve this while staying alive yourself, you win the game alone.",
                        "WOLFDOG": "A hybrid role defined by its first-night choice. On the very first night, you must decide: will you stay a faithful Villager or join the Werewolf pack? Once your choice is made, you assume that role's alignment and goals for the rest of the game.",
                        "RIPPER": "A cold-blooded serial killer acting entirely alone. You are not a wolf and not a villager. Each night, you wake up to eliminate one player of your choice. Your goal is simple but brutal: you win by being the last person alive in the village.",
                        "SURVIVOR": "A resilient loner in a world of monsters. You belong to the village camp but have no active powers to help them. Instead, you have two personal shields. Up to twice per game, you can choose to protect yourself during the night, making you immune to any attack.",
                        "PYROMANIAC": "A destructive arsonist with a long-term plan. Each night, you can douse two players in oil. These players won't know they are oiled. At any later point, you can choose to ignite the oil, instantly eliminating every single player you have previously marked.",
                        "THIEF": "A cunning opportunist who starts with nothing. On the very first night, you choose a player. You swap roles with them: you take their identity and powers, and they become a regular Villager. Use this to seize the most powerful role in the game."
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
                        "start_vote": "Start Voting",
                        "narrator_mode": "Narrator Mode",
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
                            "instruction": "The pack is asleep and the coast is clear. Which of your fellow werewolves will you eliminate tonight to get closer to your solitary victory?"
                        },
                        "easter_bunny": {
                            "instruction": "Spring is coming. Select two players to receive your mysterious eggs. Your ultimate gift is almost ready."
                        },
                        "wolfdog": {
                            "instruction": "The first night is your time of choice. Do you remain loyal to the Village that raised you, or do you embrace your wild side and join the Werewolf pack?"
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
                        },
                        "editor": {
                            "title": "Role Editor",
                            "add_role": "Add Role",
                            "edit_role": "Edit Role",
                            "new_role": "New Role",
                            "alignment": "Alignment",
                            "abilities": "Abilities",
                            "add_ability": "Add Ability",
                            "ability_type": "Action",
                            "timing": "Timing",
                            "targets": "Targets",
                            "ability_instruction_kill": "Choose a victim to eliminate.",
                            "ability_instruction_heal": "Choose a player to save from death.",
                            "ability_instruction_protect": "Choose a player to protect tonight.",
                            "ability_instruction_infect": "Choose a player to infect.",
                            "ability_instruction_check_role": "Choose a player to reveal their secret role.",
                            "ability_instruction_link_lovers": "Choose two players to fall in love.",
                            "ability_instruction_give_egg": "Choose players to receive a special item.",
                            "ability_instruction_choose_camp": "Choose your loyalty for the rest of the game.",
                            "ability_instruction_steal_role": "Choose a player to swap roles with."
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
                "skip": "Skip",
                "close": "Close"
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
                        "VILLAGER": "Ein gewöhnlicher Bewohner des Dorfes. Du hast in der Nacht keine besonderen Kräfte, aber deine Stimme und deine Stimme sind am Tag deine einzige Waffe. Arbeite mit anderen zusammen, um die Werwölfe und andere Bedrohungen zu finden und zu eliminieren.",
                        "WEREWOLF": "Eine furchterregende Kreatur der Nacht. Jede Nacht wählst du mit deinem Rudel einen Bewohner aus, der gefressen werden soll. Am Tag musst du dich anpassen und deine wahre Natur verbergen, um nicht gehängt zu werden. Ihr gewinnt, wenn ihr genug Dorfbewohner eliminiert habt.",
                        "SEER": "Ein Mystiker mit der Gabe der Vorhersehung. Jede Nacht wachst du allein auf und wählst einen Spieler. Der Erzähler zeigt dir dessen wahre Rollenkarte. Nutze dieses Wissen weise, um das Dorf zu führen, aber sei vorsichtig, dich nicht als Ziel für die Wölfe zu verraten.",
                        "WITCH": "Eine Meisterin der Alchemie mit zwei mächtigen Tränken. Einmal pro Spiel kannst du mit deinem Heiltrank ein Opfer der Werwölfe retten. Einmal pro Spiel kannst du mit deinem Gifttrank einen beliebigen Spieler eliminieren. Du kannst beide Tränke in derselben Nacht verwenden.",
                        "HUNTER": "Ein erfahrener Schütze. Deine Kraft wird erst im Moment deines Todes aktiviert. Wenn du aus dem Spiel ausscheidest (durch Wölfe oder die Dorf-Abstimmung), darfst du sofort einen letzten Schuss abgeben und einen anderen Spieler deiner Wahl mit in den Tod nehmen.",
                        "CUPID": "Der Überbringer von Liebe und Schicksal. In der allerersten Nacht wählst du zwei Spieler aus (du kannst auch dich selbst wählen), die zum Liebespaar werden. Stirbt einer von ihnen, stirbt der andere sofort an gebrochenem Herzen. Ihre Schicksale sind nun untrennbar verbunden.",
                        "LITTLE_GIRL": "Ein mutiges Kind mit neugierigen Augen. In der Nacht, während die Werwölfe ihr Opfer wählen, darfst du blinzeln und versuchen, sie zu identifizieren. Wenn du einen Wolf erkennst, ist das ein großer Vorteil, aber wenn sie dich erwischen, wirst du sofort gefressen!",
                        "DETECTIVE": "Ein scharfsinniger Ermittler der Gesinnung. Jede Nacht wählst du zwei Spieler aus. Der Erzähler verrät dir, ob sie zum selben Team gehören (z. B. beide Dorfbewohner oder beide Werwölfe) oder zu verschiedenen Lagern. Perfekt, um das Rudel aufzudecken.",
                        "GUARDIAN": "Ein selbstloser Beschützer. Jede Nacht wählst du einen Spieler aus, den du vor den Werwölfen bewachst. Er kann heute Nacht nicht durch einen Werwolf-Angriff sterben. Du darfst dich selbst schützen, aber niemals dieselbe Person zwei Nächte hintereinander.",
                        "BLACK_CAT": "Ein Bote des Unglücks. Jede Nacht kannst du einen Spieler verfluchen. Dieser Spieler erhält bei der nächsten Dorf-Abstimmung automatisch eine unsichtbare Zusatzstimme gegen sich, was es einfacher macht, ihn aus dem Dorf zu werfen.",
                        "WISE": "Ein Ältester mit uralter Widerstandskraft. Du bist so robust, dass du den ersten erfolgreichen Angriff der Werwölfe überlebben kannst. Du stirbst nicht und das Spiel geht weiter. Erst bei einem zweiten Angriff (durch Wölfe oder Mörder) wirst du wie jeder andere sterben.",
                        "BLACK_WEREWOLF": "Der Alpha des Rudels. Du bist ein normaler Werwolf mit einer Sonderkraft: Einmal pro Spiel kannst du wählen, das Opfer der Werwölfe zu infizieren, anstatt es zu töten. Das Opfer verliert seine ursprüngliche Rolle und gehört fortan heimlich zu eurem Werwolf-Rudel.",
                        "WHITE_WEREWOLF": "Ein einsamer Abtrünniger, der ein doppeltes Spiel spielt. Jede Nacht wachst du zuerst mit den anderen Werwölfen auf, um gemeinsam zu jagen. Sobald diese schlafen, wachst du heimlich erneut auf, um einen anderen Werwolf zu eliminieren. Du gewinnst nur, wenn du der letzte Überlebende bist.",
                        "ANGEL": "Ein himmlisches Wesen, das einen schnellen Abgang sucht. Dein Ziel ist ungewöhnlich: Du gewinnst das Spiel sofort, wenn es dir gelingt, in der allerersten Abstimmungsphase des Tages hingerichtet zu werden. Überlebst du den ersten Tag, wirst du zu einem einfachen Dorfbewohner.",
                        "EASTER_BUNNY": "Ein mysteriöser Besucher mit einer Geheimmission. Jede Nacht gibst du zwei Spielern Eier. Dein Ziel ist es, jedem lebenden Spieler im Dorf ein Ei zu geben. Wenn dir das gelingt und du selbst noch lebst, gewinnst du das Spiel ganz allein.",
                        "WOLFDOG": "Eine Hybrid-Rolle, die durch ihre Wahl in der ersten Nacht definiert wird. In der allerersten Nacht musst du dich entscheiden: Bleibst du ein treuer Dorfbewohner oder schließt du dich dem Werwolf-Rudel an? Deine Wahl bestimmt dein Ziel für den Rest des Spiels.",
                        "RIPPER": "Ein kaltblütiger Serienmörder, der völlig allein handelt. Du bist kein Wolf und kein Dorfbewohner. Jede Nacht wachst du auf, um einen Spieler deiner Wahl zu eliminieren. Dein Ziel ist brutal: Du gewinnst, wenn du am Ende als einziger Überlebender im Dorf übrig bleibst.",
                        "SURVIVOR": "Ein zäher Einzelgänger in einer Welt voller Monster. Du gehörst zum Dorf-Lager, hast aber keine aktiven Kräfte für andere. Stattdessen hast du zwei persönliche Schutzschilde, die du nachts aktivieren kannst, um gegen Angriffe immun zu sein.",
                        "PYROMANIAC": "Ein zerstörerischer Brandstifter mit einem Langzeitplan. Jede Nacht übergießt du zwei Spieler mit Öl. Diese wissen nichts davon. Zu jedem späteren Zeitpunkt kannst du wählen, das Öl zu entzünden, wodurch alle markierten Spieler gleichzeitig in einer Nacht sterben.",
                        "THIEF": "Ein listiger Opportunist, der ohne eigene Rolle startet. In der ersten Nacht wählst du einen Spieler und stiehlst seine Identität. Du übernimmst seine Rolle und Kräfte, während das Opfer zu einem einfachen Dorfbewohner ohne Fähigkeiten wird."
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
                        "start_vote": "Abstimmung starten",
                        "narrator_mode": "Erzählermodus",
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
                            "instruction": "Das Rudel schläft und die Luft ist rein. Welchen deiner Werwolf-Artgenossen wirst du heute Nacht eliminieren, um deinem Einzelsieg näher zu kommen?"
                        },
                        "easter_bunny": {
                            "instruction": "Der Frühling naht. Wähle zwei Spieler aus, die deine geheimnisvollen Eier erhalten sollen. Dein ultimatives Geschenk ist fast bereit."
                        },
                        "wolfdog": {
                            "instruction": "In dieser ersten Nacht musst du dich entscheiden. Bleibst du dem Dorf treu, das dich aufgezogen hat, oder gibst du deiner wilden Seite nach und schließt dich dem Rudel der Werwölfe an?"
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
                        },
                        "editor": {
                            "title": "Rollen-Editor",
                            "add_role": "Rolle hinzufügen",
                            "edit_role": "Rolle bearbeiten",
                            "new_role": "Neue Rolle",
                            "alignment": "Gesinnung",
                            "abilities": "Fähigkeiten",
                            "add_ability": "Fähigkeit hinzufügen",
                            "ability_type": "Aktion",
                            "timing": "Zeitpunkt",
                            "targets": "Ziele",
                            "ability_instruction_kill": "Wähle ein Opfer zum Eliminieren.",
                            "ability_instruction_heal": "Wähle einen Spieler zum Retten.",
                            "ability_instruction_protect": "Wähle einen Spieler zum Beschützen.",
                            "ability_instruction_infect": "Wähle einen Spieler zum Infizieren.",
                            "ability_instruction_check_role": "Wähle einen Spieler, um seine Rolle zu sehen.",
                            "ability_instruction_link_lovers": "Wähle zwei Spieler, die sich verlieben sollen.",
                            "ability_instruction_give_egg": "Wähle Spieler, die einen Gegenstand erhalten.",
                            "ability_instruction_choose_camp": "Wähle dein Team für den Rest des Spiels.",
                            "ability_instruction_steal_role": "Wähle einen Spieler, dessen Rolle du stiehlst."
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
                "skip": "Überspringen",
                "close": "Schließen"
            }
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: localStorage.getItem('language') || "en",
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    });

i18n.on('languageChanged', (lng) => {
    localStorage.setItem('language', lng);
});

export default i18n;
