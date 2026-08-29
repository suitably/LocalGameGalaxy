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
                mode_label: "Sheet:",
                stairs: "Stairs",
                bonus_red_yellow: "★ Bonus Row Red-Yellow (counts for both rows)",
                bonus_green_blue: "★ Bonus Row Green-Blue (counts for both rows)",
                select_sheet_title: "Choose Score Sheet",
                select_sheet_subtitle: "Discover official editions, alternative layouts, and randomizer modes",
                select_preset: "Sheet Layout:",
                reroll_layout: "🎲 Re-roll Layout",
                random_block_button: "🎲 Random Sheet",
                random_pick_title: "Pick a Random Sheet",
                random_pick_subtitle: "Let fate decide and jump right in with a random game mode and sheet layout!",
                pick_random_block: "🎲 Play Random Sheet",
                random_block_in_mode: "Random",
                active_badge: "Active",
                apply_sheet: "Select Sheet",
                random_mode: "Random Mode",
                preview_title: "SCORE SHEET PREVIEW",
                rules_crossing_title: "Crossing & Dice Rules",
                rules_scoring_title: "Scoring & Special Features",
                rules_tips_title: "Tactical Tip",
                view_rules: "Read Rules",
                play_this_sheet: "Play This Sheet",
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
                tap_die_hint: "Tap a die to highlight crossable numbers",
                bonus_legend_title: "Bonus Icons & Effects",
                active_shields: "Active Shields",
                bonus_shield_title: "Miss Shield",
                bonus_shield_desc: "Automatically absorbs the next penalty miss (avoids -5 pts).",
                bonus_self_title: "Instant Cross",
                bonus_self_desc: "Immediately places the next available cross in this row.",
                bonus_partner_title: "Partner Cross",
                bonus_partner_desc: "Immediately places the next available cross in the target partner row.",
                double_banner_title: "Double Numbers Mode:",
                double_banner_desc: "Golden-bordered 2× boxes count as 2 crosses (XX) immediately when crossed!",
                rules: {
                    default: {
                        crossing: "Cross numbers from left to right. White sum can be used in any row, colored dice only in matching color.",
                        scoring: "Row score increases with total crosses: 1=1, 2=3, 3=6, ..., 12=78 pts. Misses: -5 pts each.",
                        tip: "Focus on 2 main rows and prepare 5 crosses to unlock the row lock."
                    },
                    classic: {
                        crossing: "Standard left-to-right crossing. White dice sum applies to any row; colored die plus white die applies to that color row only.",
                        scoring: "Each row scores: 1=1, 2=3, 3=6, 4=10, 5=15, 6=21, 7=28, 8=36, 9=45, 10=55, 11=66, 12=78. Lock adds +1 cross and removes die.",
                        tip: "Try not to skip too many numbers early in your strong rows."
                    },
                    gemixxt_a: {
                        crossing: "Numbers remain in order (2-12 / 12-2), but colors shift in segments! Colored dice can only be placed on cells of that exact color.",
                        scoring: "Score rows individually. Locking a row removes the die matching the color of that row's lock box.",
                        tip: "Keep an eye on the color transitions to plan your colored dice combinations."
                    },
                    gemixxt_b: {
                        crossing: "Row colors are uniform, but numbers are scrambled! Cross strictly from left to right according to the printed layout.",
                        scoring: "Rows are locked with their rightmost number once at least 5 crosses are placed.",
                        tip: "Check ahead carefully: numbers jump around unpredictably, so plan your jumps wisely."
                    },
                    big_points: {
                        crossing: "Bonus rows can be crossed if the corresponding number in at least one adjacent color row is already marked.",
                        scoring: "Every cross in a bonus row adds to BOTH adjacent color row counts (e.g. Red-Yellow adds +1 to Red AND +1 to Yellow, up to 120 pts!).",
                        tip: "Fill numbers in adjacent color rows first to unlock massive bonus crosses."
                    },
                    connected_stairs: {
                        crossing: "11 stair fields form a continuous diagonal across all rows with a golden border. Cross them normally left-to-right.",
                        scoring: "Crossed stair fields score as an independent 5th bonus category using the standard point formula (up to +66 pts).",
                        tip: "Target the diagonal stair cells whenever possible to earn huge 5th category bonus points."
                    },
                    connected_chains: {
                        crossing: "Crossing a linked chain cell immediately forces a free cross in the connected partner cell in the other row.",
                        scoring: "Standard row scoring minus penalty misses.",
                        tip: "Trigger chains to leap forward and earn extra marks in other rows without spending dice."
                    },
                    double_sub: {
                        crossing: "Every number has a secondary sub-box. If the main number is crossed and rolled again, you can check its sub-box.",
                        scoring: "Sub-boxes add full extra crosses to that row's final count (up to 16+ crosses).",
                        tip: "Use duplicate rolls to supercharge your completed numbers."
                    },
                    double_numbers: {
                        crossing: "Designated boxes contain double numbers that count as 2 crosses immediately when marked.",
                        scoring: "Standard scoring with accelerated row count progression.",
                        tip: "Prioritize double number boxes to quickly reach the 5 crosses needed to lock."
                    },
                    bonus: {
                        crossing: "Special bonus icons grant instant perks when crossed (extra crosses, shields against misses, or doubling).",
                        scoring: "Bonus effects enhance your final score or mitigate penalties.",
                        tip: "Align your roll choices with the bonus icons for tactical advantages."
                    },
                    random_mix: {
                        crossing: "Dynamically generated balanced random layout with shuffled numbers per row.",
                        scoring: "Standard triangular scoring and rightmost lock rules.",
                        tip: "Analyze the generated sequence carefully before your first roll!"
                    }
                },
                sheets: {
                    classic: {
                        name: "Qwixx Classic",
                        badge: "Original",
                        desc: "Standard layout with 4 rows (Red & Yellow ascending 2-12, Green & Blue descending 12-2)."
                    },
                    gemixxt_a: {
                        name: "Gemixxt — Multi-Color",
                        badge: "Color Shift",
                        desc: "Numbers are sorted normally, but row colors change in segments. Choose between Block 1 & Block 2."
                    },
                    gemixxt_b: {
                        name: "Gemixxt — Mixed Numbers",
                        badge: "Wild Order",
                        desc: "Row colors are uniform, but numbers are scrambled. Choose between Block 1, Block 2, or Block 3."
                    },
                    big_points: {
                        name: "Big Points",
                        badge: "High Score",
                        desc: "Includes 2 two-colored bonus rows. Crosses in bonus rows count towards BOTH adjacent rows (up to 120 pts per row!)."
                    },
                    connected_stairs: {
                        name: "Connected — Stairs",
                        badge: "5th Category",
                        desc: "11 stair fields form a diagonal across all rows. Crossed stair fields score as a 5th bonus category (up to +66 pts)."
                    },
                    connected_chains: {
                        name: "Connected — Chains",
                        badge: "Linked Pairs",
                        desc: "Connected cells link pairs across rows: crossing one forces crossing the linked target cell immediately."
                    },
                    double_sub: {
                        name: "Double — Sub-Boxes",
                        badge: "Re-roll Bonus",
                        desc: "Each number has a sub-box. If already crossed and rolled again, you can check the sub-box for extra points."
                    },
                    double_numbers: {
                        name: "Double — Double Numbers",
                        badge: "Fast Track",
                        desc: "Designated fields contain double numbers that count as 2 crosses at once."
                    },
                    bonus: {
                        name: "Bonus Icons",
                        badge: "Special Powers",
                        desc: "Special icons trigger chain actions, instant free crosses, or shields against penalty misses."
                    },
                    random_mix: {
                        name: "Randomizer (Custom Mix)",
                        badge: "Dynamic",
                        desc: "Generates a fresh, balanced scrambled layout for all four rows with a single tap."
                    }
                }
            }
        }
    },
    de: {
        games: {
            qwixx: {
                title: "Qwixx",
                description: "Taktisches Würfelspiel auf dem Wertungszettel. Kreuze Zahlen an, schließe Reihen ab und maximiere deine Punktzahl!",
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
                mode_label: "Block:",
                stairs: "Treppe",
                bonus_red_yellow: "★ Bonusreihe Rot-Gelb (zählt für beide Reihen)",
                bonus_green_blue: "★ Bonusreihe Grün-Blau (zählt für beide Reihen)",
                select_sheet_title: "Wertungsblock auswählen",
                select_sheet_subtitle: "Entdecke offizielle Editionen, alternative Layouts und den Zufallsgenerator",
                select_preset: "Block-Layout:",
                reroll_layout: "🎲 Neues Layout würfeln",
                random_block_button: "🎲 Zufälliger Block",
                random_pick_title: "Zufälligen Block spielen",
                random_pick_subtitle: "Lass das Schicksal entscheiden und starte direkt mit einer zufälligen Edition und Anordnung!",
                pick_random_block: "🎲 Zufälligen Block spielen",
                random_block_in_mode: "Zufall",
                active_badge: "Aktiv",
                apply_sheet: "Block wählen",
                random_mode: "Zufalls-Modus",
                preview_title: "VORSCHAU DES WERTUNGSBLOCKS",
                rules_crossing_title: "Ankreuz- & Würfelregeln",
                rules_scoring_title: "Wertung & Besonderheiten",
                rules_tips_title: "Taktik-Tipp",
                view_rules: "Regeln lesen",
                play_this_sheet: "Diesen Block spielen",
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
                tap_die_hint: "Tippe auf einen Würfel, um ankreuzbare Zahlen hervorzuheben",
                bonus_legend_title: "Bonus-Symbole & Effekte",
                active_shields: "Aktive Schutzschilde",
                bonus_shield_title: "Schutzschild",
                bonus_shield_desc: "Fängt den nächsten Fehlwurf automatisch ab (-5 Pkt vermieden).",
                bonus_self_title: "Sofort-Kreuz",
                bonus_self_desc: "Setzt sofort das nächste freie Kreuz in dieser Reihe.",
                bonus_partner_title: "Partner-Kreuz",
                bonus_partner_desc: "Setzt sofort das nächste freie Kreuz in der angegebenen Partner-Reihe.",
                double_banner_title: "Doppelzahlen-Modus:",
                double_banner_desc: "Die golden umrandeten 2×-Felder zählen beim Ankreuzen sofort als 2 Kreuze (XX) für die Reihe!",
                rules: {
                    default: {
                        crossing: "Kreuze von links nach rechts setzen. Die Summe der weißen Würfel darf überall genutzt werden, der Farbwürfel nur in der passenden Zeile.",
                        scoring: "Punkte steigen exponentiell mit der Anzahl der Kreuze: 1=1, 2=3, 3=6, ..., 12=78 Punkte. Fehlwürfe geben je -5 Punkte.",
                        tip: "Konzentriere dich auf 2 Reihen und versuche mind. 5 Kreuze vorzubereiten."
                    },
                    classic: {
                        crossing: "Klassisches Ankreuzen von links nach rechts. Weiße Würfelsumme gilt für alle Zeilen, Farbwürfel + Weiß nur für die jeweilige Farbe.",
                        scoring: "Punkte je Reihe: 1=1, 2=3, 3=6, 4=10, 5=15, 6=21, 7=28, 8=36, 9=45, 10=55, 11=66, 12=78. Schloss gibt +1 Kreuz und entfernt den Würfel.",
                        tip: "Überspringe in deinen starken Farben am Anfang nicht zu viele Zahlen."
                    },
                    gemixxt_a: {
                        crossing: "Zahlen bleiben sortiert (2–12 / 12–2), aber die Farben wechseln in Segmenten! Farbwürfel dürfen nur auf Feldern ihrer eigenen Farbe genutzt werden.",
                        scoring: "Jede Zeile wird regulär gewertet. Beim Schließen einer Reihe wird der Farbwürfel der Abschlussfarbe entfernt.",
                        tip: "Achte genau auf die Farbwechsel, um Farbwürfel für verschiedene Zeilen taktisch einzusetzen."
                    },
                    gemixxt_b: {
                        crossing: "Reihenfarben sind einheitlich, aber die Zahlen sind wild gewürfelt! Es muss streng von links nach rechts angekreuzt werden.",
                        scoring: "Reihen werden mit ihrer letzten rechten Zahl und mind. 5 Kreuzen abgeschlossen.",
                        tip: "Prüfe vor jedem Kreuz, welche Zahlen rechts noch kommen, um nicht versehentlich wertvolle Zahlen abzuschneiden."
                    },
                    big_points: {
                        crossing: "Bonusreihen dürfen angekreuzt werden, wenn in derselben Spalte mindestens ein Feld der angrenzenden Farbreihen markiert ist.",
                        scoring: "Jedes Kreuz in einer Bonusreihe zählt für BEIDE Nachbarfarben (z. B. Rot-Gelb zählt für Rot UND Gelb, bis zu 120 Punkte pro Reihe!).",
                        tip: "Schließe erst Zahlen in den Farbreihen ab, um die doppelt zählenden Bonusfelder freizuschalten."
                    },
                    connected_stairs: {
                        crossing: "11 Treppenfelder bilden eine Diagonale quer über alle Reihen. Werden wie normale Felder von links nach rechts bespielt.",
                        scoring: "Alle angekreuzten Treppenfelder werden als 5. Wertungskategorie nach der Standard-Punktetabelle gewertet (bis zu +66 Bonuspunkte!).",
                        tip: "Nimm Treppenfelder bevorzugt mit, um die zusätzliche 5. Wertung voll auszuschöpfen."
                    },
                    connected_chains: {
                        crossing: "Kreuzt du ein Kettenfeld an, MUSS sofort auch das verbundene Partnerfeld in der anderen Reihe markiert werden.",
                        scoring: "Reguläre 4-Reihen-Wertung abzüglich Fehlwürfe.",
                        tip: "Nutze Ketten, um ohne Würfelekombination kostenlose Kreuze in Partnerreihen zu setzen."
                    },
                    double_sub: {
                        crossing: "Jedes Zahlenfeld besitzt ein Unterkästchen. Ist die Hauptzahl markiert, darf bei erneutem Wurf das Unterkästchen angekreuzt werden.",
                        scoring: "Zusatzkästchen zählen als vollwertige Extrakreuze für die jeweilige Reihe (bis zu 16+ Kreuze).",
                        tip: "Nutze doppelt gewürfelte Zahlen, um zusätzliche Kreuze zu sammeln."
                    },
                    double_numbers: {
                        crossing: "Doppelzahlen-Felder zählen beim Ankreuzen sofort als 2 Kreuze für die Reihe.",
                        scoring: "Standardwertung mit schnellerem Erreichen der 5 nötigen Kreuze.",
                        tip: "Setze vorrangig auf Doppelzahlen, um die Reihe rasch zu sperren."
                    },
                    bonus: {
                        crossing: "Spezialsymbole auf den Zahlenfeldern gewähren Sofort-Boni: Sofort-Kreuze in derselben Reihe, Partner-Kreuze in anderen Farben oder Schutzschilde vor Fehlwürfen.",
                        scoring: "Boni verbessern das Endergebnis oder schützen vor Punktabzügen.",
                        tip: "Richte deine Züge strategisch an den Bonussymbolen aus."
                    },
                    random_mix: {
                        crossing: "Dynamisch generierte, ausgewogene Zufalls-Anordnung mit gemischten Zahlen je Farbreihe.",
                        scoring: "Klassische Wertung und Schließen mit der ganz rechten Zahl.",
                        tip: "Verschaffe dir vor dem ersten Wurf einen Überblick über die generierte Reihenfolge!"
                    }
                },
                sheets: {
                    classic: {
                        name: "Qwixx Klassisch",
                        badge: "Original",
                        desc: "Klassischer Standard-Block mit 4 Farbreihen (Rot & Gelb aufsteigend 2–12, Grün & Blau absteigend 12–2)."
                    },
                    gemixxt_a: {
                        name: "Gemixxt — Mehrfarbig",
                        badge: "Farbwechsel",
                        desc: "Zahlen bleiben sortiert, aber die Farben wechseln in Segmenten. Wähle zwischen Block 1 und Block 2."
                    },
                    gemixxt_b: {
                        name: "Gemixxt — Gemischte Zahlen",
                        badge: "Zahlenchaos",
                        desc: "Reihenfarben bleiben einheitlich, aber die Zahlen sind wild gemischt. Wähle zwischen Block 1, Block 2 oder Block 3."
                    },
                    big_points: {
                        name: "Big Points",
                        badge: "High Score",
                        desc: "2 zweifarbige Bonusreihen. Kreuze in Bonusreihen zählen für BEIDE Nachbarfarben (bis zu 120 Pkt pro Reihe!)."
                    },
                    connected_stairs: {
                        name: "Connected — Treppe",
                        badge: "5. Wertung",
                        desc: "11 Treppenfelder bilden eine Diagonale über alle Reihen. Treppenkreuze zählen als 5. Kategorie (bis zu +66 Pkt)."
                    },
                    connected_chains: {
                        name: "Connected — Kette",
                        badge: "Verkettet",
                        desc: "Verbundene Zahlenpaare: Das Ankreuzen eines Kettenfeldes zwingt sofort zum Kreuz im Partnerfeld."
                    },
                    double_sub: {
                        name: "Double — Zusatzkästchen",
                        badge: "Zweitwurf",
                        desc: "Jedes Zahlenfeld hat ein Unterkästchen. Bei erneutem Würfeln derselben Zahl darf das Zusatzkästchen markiert werden."
                    },
                    double_numbers: {
                        name: "Double — Doppelzahlen",
                        badge: "Turbo",
                        desc: "Bestimmte Felder tragen Doppelzahlen und zählen beim Ankreuzen direkt als 2 Kreuze."
                    },
                    bonus: {
                        name: "Bonus-Symbole",
                        badge: "Sondereffekte",
                        desc: "Spezialsymbole gewähren Kettenreaktionen, Gratis-Kreuze oder Schutz vor Fehlwürfen."
                    },
                    random_mix: {
                        name: "Randomizer (Eigene Mischung)",
                        badge: "Dynamisch",
                        desc: "Erzeugt per Knopfdruck eine neue, gültig gemischte Zahlenanordnung für alle vier Reihen."
                    }
                }
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
