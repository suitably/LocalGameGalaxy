# Gartic Phone / Party-Modus Integration Plan

## Goal Description
Enhance and integrate Gartic Phone (Party Mode / Stille Post Zeichnen) as a first-class game mode in LocalGameGalaxy with full multi-device online/local synchronization, seamless lobby-to-game transitions, and a dedicated Hub game tile.

## Key Features & Requirements
1. **Game Registry & Routing**:
   - Register Gartic Phone / Party Mode in `src/lib/gameRegistry.tsx` (route: `games/garticphone`).
   - Add Game Tile to Hub with title, description, color scheme, and party icon.
2. **Multi-Device Party Synchronization**:
   - Integrate `universalPartyManager` / MQTT mailbox sync directly into `GarticPhoneGame.tsx`.
   - Support remote players joining via QR/link (`#/games/garticphone?room=XYZ` or `#/party?room=XYZ`).
   - Automatically bind each connected player to their individual device (hiding other players' tasks so there's no cheating).
   - Support Single-Device Pass-and-Play mode if playing locally on one phone/tablet.
3. **Turn Progression & Album Reveal**:
   - Round 0 (Prompt): All players write an initial sentence.
   - Round 1 (Drawing): Players draw what the previous player wrote.
   - Round 2 (Guessing): Players guess what the previous player drew.
   - Reveal Phase: Synchronized album reveal with drawing replay animations and author attributions.
4. **SOLID & Quality Standards**:
   - Keep files modular and < 250 lines.
   - German & English i18n support.
   - Zero TypeScript/ESLint warnings.

## Proposed Changes
- `src/lib/gameRegistry.tsx`: Register `garticphone` as a standalone game.
- `src/games/guessart/garticphone/GarticPhoneGame.tsx`: Integrate MQTT / Universal Party Room sync, handle remote device player matching, and polish UI.
- `src/games/guessart/garticphone/components/GarticLobby.tsx`: Support party room code sharing, QR code, and connected players roster.
- `src/games/guessart/garticphone/components/GarticAlbumReveal.tsx`: Polish reveal presentation and replay controls.
- `public/locales/de/translation.json` & `public/locales/en/translation.json`: Add all required keys.

## Verification Plan
1. `npm test`: Run unit tests.
2. `npm run lint`: Ensure 0 ESLint errors.
3. `npm run build`: Verify clean compilation.
