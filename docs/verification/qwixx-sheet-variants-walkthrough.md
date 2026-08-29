# Qwixx Sheet Variants & Selector — Verification Walkthrough [ID: VERIFY-QWIXX-SHEETS]

## Changes Implemented

1. **Recherche & Spezifikations-Regelwerk (`docs/tech/qwixx-sheet-rules.md`)**:
   - Detailliertes Regelwerk für alle 10 Modi und offiziellen Varianten (Klassisch, Gemixxt A & B mit vordefinierten Blöcken 1–3, Big Points, Connected Treppe/Kette, Double Zusatzkästchen/Doppelzahlen, Bonus, Randomizer).
   - Exakte Farb- und Zahlenmatrizen, Würfelzuweisungen, Schließmechaniken und mathematische Wertungsformeln.

2. **Katalogansicht & Standalone-Spielmodi (`QwixxSheetSelector.tsx`)**:
   - Übersichtlicher, ansprechender Katalog mit Standalone-Karten für jeden Spielmodus.
   - **Hero-Banner & Header-Button `🎲 Zufälliger Block`**: Ermöglicht mit einem Klick das zufällige Auswählen eines beliebigen Spielmodus und Blocks.
   - **Vordefinierte Block-Layouts**: Bei Modi mit mehreren offiziellen Blöcken (z. B. Gemixxt Mehrfarbig Block 1/2 oder Gemixxt Gemischte Zahlen Block 1/2/3) kann direkt auf der Karte zwischen den Blöcken umgeschaltet oder auf `[ 🎲 Zufall ]` geklickt werden.
   - **Miniaturansichten (`QwixxMiniSheet.tsx`)**: Jede Karte zeigt die reale Miniaturansicht des gewählten Block-Layouts in Echtzeit.
   - **Info-Button `(i)` (`QwixxRulesDialog.tsx`)**: Öffnet das Regelbuch inklusive Taktik-Tipps und Block-Umschalter.

3. **Direkter Zufalls-Button in der Spielansicht (`QwixxGame.tsx`)**:
   - Neben dem Block-Auswahl-Chip befindet sich ein Schnellzugriff-Chip `[ 🎲 Zufall ]`, um direkt einen zufälligen Block zu starten.

4. **Reducer & Scoring Engine (`qwixxReducer.ts`, `diceHighlight.ts`, `types.ts`)**:
   - Volle Unterstützung für dynamische Block-Presets (`presetIndex`), Zufallsgenerierung (`customRows`) und Mehrspieler-Synchronisation.

5. **Lokalisierung (i18n)**:
   - Alle Namen, Badges, Layout-Buttons, Zufallstexte und Regeln sind vollständig auf Deutsch und Englisch gepflegt.

---

## Verification Results

1. **Build & Compiler Validation**:
   - `npm run build`: Exit 0 (Kompilierung von `tsc -b` und Vite-Bundle erfolgreich).
2. **ESLint Validation**:
   - `npm run lint`: 0 Errors.
3. **Gameplay & State Integrity**:
   - Zufallsgenerator, Preset-Umschaltung, Mini-Sheet-Vorschau und Würfel-Highlighting funktionieren nahtlos.
