# Imposter Game Mode Implementation Plan [ID: PLAN-IMPOSTER-001]

Add a new game mode "Imposter" where players are assigned words from categories. Some players are "Imposters" and receive a hint instead of the word. Players must identify the Imposters before time runs out.

## Goal Description
The objective is to create a social deduction game similar to "Undercover" or "Spyfall". Players are given a secret word, except for the "Imposters" who receive a hint or "Imposter" status. Players discuss and vote to discover who the Imposters are.

## User Review Required

> [!IMPORTANT]
> - Category and word lists will be stored in a JSON configuration file for easy extensibility.
> - The game will follow the same handover (phone-passing) pattern as Werewolf.
> - The "End Round" button will require a confirmation dialog to prevent accidental clicks.

## Proposed Changes

### Imposter Game Component [NEW]
#### [NEW] [ImposterGame.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/ImposterGame.tsx)
The main entry point for the Imposter game mode, managing the overall game state (Lobby, Handover, Timer, Voting).

### Game Logic [NEW]
#### [NEW] [types.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/logic/types.ts)
Type definitions for the Imposter game (Player, GameState, Category, etc.).
#### [NEW] [words.ts](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/logic/words.ts)
Default categories and word lists.

### Components [NEW]
#### [NEW] [GameSetup.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/components/GameSetup.tsx)
Setup screen for adding players, selecting categories, and setting the number of Imposters and timer length.
#### [NEW] [HandoverView.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/components/HandoverView.tsx)
View for passing the phone between players to reveal roles/words.
#### [NEW] [GameTimer.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/components/GameTimer.tsx)
The active game view with a countdown timer, pause/resume, and "End Round" button.
#### [NEW] [VotingView.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/imposter/components/VotingView.tsx)
View to select a player to kick out and reveal their role.

### Integration
#### [MODIFY] [App.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/App.tsx)
Add the route for the Imposter game.
#### [MODIFY] [Hub.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/features/hub/Hub.tsx)
Add a button to launch the Imposter game.
#### [MODIFY] [i18n.ts](file:///home/deck/Projects/LocalGameGalaxy/src/i18n.ts)
Add translations for the Imposter game (English and German).

## Verification Plan

### Manual Verification
- Start a game with 3-5 players.
- Verify that Imposters are correctly assigned based on the configured count.
- Verify that Normal players see the word and Imposters see the hint.
- Check that the timer starts, can be paused, and can be ended early with confirmation.
- Verify that selecting a player in the voting view correctly reveals their role and ends the game.
- Confirm that categories/words can be configured/selected.
