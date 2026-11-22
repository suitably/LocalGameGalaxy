# Architecture Decision Records (ADR) Index

This directory contains Architecture Decision Records (ADRs) for LocalGameGalaxy. ADRs document significant technical choices, context, alternatives considered, and consequences.

## Accepted Decisions

- [ADR-0001: Dexie for IndexedDB Management](0001-dexie-for-indexeddb.md) - Decision to use Dexie.js for client-side IndexedDB database access, migrations, and reactive hooks.
- [ADR-0002: BitTorrent Tracker for WebRTC Signaling](0002-bittorrent-tracker-signaling.md) - Decision to adopt a self-hosted WebSocket BitTorrent tracker for peer discovery and WebRTC offer/answer exchange.
- [ADR-0003: Capacitor for Android Packaging](0003-capacitor-android-packaging.md) - Decision to use Capacitor to package the React SPA as a native Android application without dual codebases.
- [ADR-0004: PyTorch Demucs for Local Vocal Separation](0004-pytorch-demucs-vocal-separation.md) - Decision to run vocal separation locally via `audio-separator` instead of a cloud API. **Superseded by ADR-0006** (the code uses the UVR-MDX-NET ONNX model, not Demucs).
- [ADR-0005: Scripting model for imported tabletop games](0005-tabletop-scripting-for-imported-games.md) - Declarative routines are the only executable model; Workshop Lua runs host-only in a sandboxed `wasmoon` VM that may only emit reducer actions; no in-page JS plugin API for third-party content. Resolves Q15.
- [ADR-0006: audio-separator ONNX and whisper-timestamped](0006-audio-separator-onnx-whisper-alignment.md) - Stems via `audio-separator[cpu]` with `UVR-MDX-NET-Inst_HQ_3.onnx`, lyric alignment via `whisper-timestamped`, CPU PyTorch kept for Whisper. Supersedes ADR-0004. Resolves Q13.
- [ADR-0007: Melodiq Notes drum lanes](0007-melodiq-notes-drum-lanes.md) - Own judged lanes for toms 1–3 and floor tom, a percussion lane (display-only by default, user setting), only the lanes a song uses, colours over glyphs; pult keeps one tom pad. Resolves #571.
- [ADR-0008: Leftovers of the one-lobby epic](0008-party-lobby-leftovers.md) - Hub-started Melodiq keeps its pairing screen (same WebRTC transport), GuessArt live limits and no `part=` link stay, a running game keeps its host until the lobby, unused Gartic keys removed. Resolves #661.
