# Tasks

Agent-ready specs for **open** work. Each mirrors a GitHub issue in `suitably/LocalGameGalaxy`. When the issue closes, move the spec to [archive/](../archive/index.md) and update this list. Status checked 2026-10-18 against `consolidated/quality-sprint-october` (PR #384) — see [open-questions Q15](../open-questions.md#q15--github-issues-353361-vs-branch-state).

| Spec                                                                                                                          | Issue | State on PR #384 branch                                                               |
| ----------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------- |
| [Decompose SetupDockerTab](ISSUE-353-decompose-setup-docker-tab.md)                                                           | #353  | implemented (194 lines), issue still open                                             |
| [Melodiq queue & downloader dedup](ISSUE-354-melodiq-queue-and-downloader-dedup.md)                                           | #354  | implemented (merged into #384)                                                        |
| [Melodiq song views dedup](ISSUE-355-melodiq-song-views-dedup.md)                                                             | #355  | implemented (merged into #384)                                                        |
| [Melodiq RemoteHostSettingsModal + typed WebRTC RPC](ISSUE-356-melodiq-remote-host-settings.md)                               | #356  | open                                                                                  |
| [Dedup GuessArt / Storyteller](ISSUE-357-dedup-guessart-storyteller.md)                                                       | #357  | implemented (merged into #384)                                                        |
| [i18n zero parity gaps](ISSUE-358-i18n-zero-parity-gaps.md)                                                                   | #358  | implemented (merged into #384)                                                        |
| [Decompose PartyLobby](ISSUE-359-decompose-party-lobby.md)                                                                    | #359  | open (`PartyLobby.tsx` 614 lines) — same goal as SOLID-17                             |
| [Cards score views dedup](ISSUE-360-cards-views-dedup.md)                                                                     | #360  | open                                                                                  |
| [WebRTC heartbeat dedup](ISSUE-361-webrtc-heartbeat-dedup.md)                                                                 | #361  | open                                                                                  |
| [Eliminate `any` in Melodiq](ISSUE-SOLID-13-eliminate-typescript-any-types-in-melodiq.md)                                     | —     | open (see [Q3](../open-questions.md#q3--no-any-is-documented-as-enforced-but-is-not)) |
| [Eliminate `any` in shared connection/party](ISSUE-SOLID-14-eliminate-typescript-any-types-in-shared-connection-and-party.md) | —     | open                                                                                  |
| [Decompose PartyLobby (SOLID)](ISSUE-SOLID-17-decompose-partylobby-god-component.md)                                          | —     | open, duplicate of #359                                                               |
