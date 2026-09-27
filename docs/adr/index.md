# Architecture Decision Records (ADR) Index

This directory contains Architecture Decision Records (ADRs) for LocalGameGalaxy. ADRs document significant technical choices, context, alternatives considered, and consequences.

## Accepted Decisions

* [ADR-0001: Dexie for IndexedDB Management](0001-dexie-for-indexeddb.md) - Decision to use Dexie.js for client-side IndexedDB database access, migrations, and reactive hooks.
* [ADR-0002: BitTorrent Tracker for WebRTC Signaling](0002-bittorrent-tracker-signaling.md) - Decision to adopt a self-hosted WebSocket BitTorrent tracker for peer discovery and WebRTC offer/answer exchange.
* [ADR-0003: Capacitor for Android Packaging](0003-capacitor-android-packaging.md) - Decision to use Capacitor to package the React SPA as a native Android application without dual codebases.
* [ADR-0004: PyTorch Demucs for Local Vocal Separation](0004-pytorch-demucs-vocal-separation.md) - Decision to run Facebook's Demucs AI model locally on the companion server for offline karaoke vocal isolation.
