# Cross-Game UI & Logic Modularization GitHub Issues

Dieses Verzeichnis enthält die 8 vorbereiteten GitHub-Issues für die Modularisierung, UI-Harmonisierung und SOLID-Bereinigung von **LocalGameGalaxy**.

## Issue-Übersicht

| Nr. | Datei | Titel | Priorität | Typ |
| :--- | :--- | :--- | :--- | :--- |
| **01** | [`ISSUE-01-decouple-storyteller-guessart-mailbox.md`](file:///home/deck/Projects/LocalGameGalaxy/docs/tasks/github-issues/ISSUE-01-decouple-storyteller-guessart-mailbox.md) | `[Critical][Architecture] Decouple Storyteller from GuessArt Mailbox & Fix Broken MQTT Sync` | **Kritisch** | Bug / Architektur |
| **02** | [`ISSUE-02-fix-navigation-trapping-and-double-headers.md`](file:///home/deck/Projects/LocalGameGalaxy/docs/tasks/github-issues/ISSUE-02-fix-navigation-trapping-and-double-headers.md) | `[UX][Navigation] Fix Melodiq Hub Navigation Trapping & Eliminate Double Headers in Sudoku, Wordle, Knister, Qwixx` | **Hoch** | UX / Navigation |
| **03** | [`ISSUE-03-adopt-shared-player-manager-imposter-werewolf-cards.md`](file:///home/deck/Projects/LocalGameGalaxy/docs/tasks/github-issues/ISSUE-03-adopt-shared-player-manager-imposter-werewolf-cards.md) | `[Refactor][SOLID] Adopt Shared PlayerManagerCard & useLobbyPlayers in Imposter, Werewolf, and Cards` | **Hoch** | Refactoring / SOLID |
| **04** | [`ISSUE-04-extract-shared-session-dialogs-share-and-edit.md`](file:///home/deck/Projects/LocalGameGalaxy/docs/tasks/github-issues/ISSUE-04-extract-shared-session-dialogs-share-and-edit.md) | `[Modularization] Extract Shared Multi-Player Session Dialogs (ShareSessionLinksDialog & EditSessionDialog)` | **Hoch** | Modularisierung |
| **05** | [`ISSUE-05-extract-generic-async-game-repository-and-engine.md`](file:///home/deck/Projects/LocalGameGalaxy/docs/tasks/github-issues/ISSUE-05-extract-generic-async-game-repository-and-engine.md) | `[Modularization] Extract Generic Async Game Repository & Conflict Engine Base` | **Mittel** | Modularisierung |
| **06** | [`ISSUE-06-unify-global-theme-cards-and-cta-buttons.md`](file:///home/deck/Projects/LocalGameGalaxy/docs/tasks/github-issues/ISSUE-06-unify-global-theme-cards-and-cta-buttons.md) | `[Global][Design System] Unify Theme Tokens, Card Elevation, and Standardize Primary CTA Buttons` | **Mittel** | Design System |
| **07** | [`ISSUE-07-centralize-storage-keys-and-eliminate-raw-localstorage.md`](file:///home/deck/Projects/LocalGameGalaxy/docs/tasks/github-issues/ISSUE-07-centralize-storage-keys-and-eliminate-raw-localstorage.md) | `[Global][Storage] Eliminate Raw LocalStorage Bypasses & Centralize Key Registry in storage.ts` | **Mittel** | Storage / Resilienz |
| **08** | [`ISSUE-08-standardize-dialog-architecture-and-a11y.md`](file:///home/deck/Projects/LocalGameGalaxy/docs/tasks/github-issues/ISSUE-08-standardize-dialog-architecture-and-a11y.md) | `[Global][A11y] Standardize Dialog Architecture (Eliminate HTML <dialog> & Native window.confirm) and Fix Missing Aria-Labels` | **Mittel** | A11y / Best Practices |

---

## Automatische Übertragung zu GitHub

Um alle 8 Issues direkt im GitHub-Repository `suitably/LocalGameGalaxy` anzulegen, führe folgenden Befehl aus:

```bash
GITHUB_TOKEN="ghp_dein_personal_access_token" node scripts/create_github_issues.mjs
```

Das Skript liest die Markdown-Dateien samt Metadaten (Titel, Labels) und erstellt die Issues über die offizielle GitHub REST API.
