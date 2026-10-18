---
type: Technical Evaluation
title: FOSS Music Streaming & Karaoke Integration
description: Evaluation of FOSS music streaming platforms for PWA integration and karaoke features (USDB TXT, Mic Input, Video).
resource: docs/tech/
tags: [architecture, evaluation, jellyfin, navidrome, pwa, karaoke]
status: stable
verified:
  at: null
  method: 'dated snapshot; facts may be stale by design'
---

# FOSS Music Streaming & Karaoke Integration Analysis

## 1. Executive Summary

This document evaluates modern Free and Open-Source Software (FOSS) music streaming platforms capable of providing a solid Progressive Web App (PWA) experience, with the specific goal of extending them into a fully-featured Karaoke engine for Melodiq.

The objective is to pivot from building a bespoke backend infrastructure for media management and instead build a "Karaoke Plugin/PWA Frontend" that leverages robust, existing media servers. This PWA will handle:

- Synchronization of USDB (`.txt`) files for lyrics and notes.
- Local Web Audio API-based microphone pitch detection.
- Background video synchronization (if available).

## 2. Evaluation of FOSS Music Streaming Platforms

| Platform      | PWA / Web Experience                                                    | Media Types Supported            | Karaoke Integration Suitability                                                                                                                               |
| :------------ | :---------------------------------------------------------------------- | :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Jellyfin**  | Excellent. Fully-featured web client installable as a PWA. Polished UI. | Audio, Video, Subtitles, Images. | **High.** Best overall fit. Handles mixed audio/video libraries seamlessly. Strong REST API. Projects like Nightingale already use Jellyfin as a backend.     |
| **Navidrome** | Good. Lightweight, responsive web UI.                                   | Audio only.                      | **Medium-High.** Excellent for audio-only setups. Fast and Subsonic-API compatible. However, lacks native video support which is often desirable for karaoke. |
| **Funkwhale** | Federated, browser-based.                                               | Audio only.                      | **Medium.** Good REST API and federation, but concepts like synced lyrics and sidecar files (`.txt`) are not natively supported as easily.                    |
| **Ampache**   | Mature, responsive web UI.                                              | Audio, Video.                    | **Medium.** Capable backend, but integration would require significant custom metadata mapping for karaoke specifics.                                         |

**Recommendation:** **Jellyfin** is the strongest candidate due to its robust support for both Audio and Video, its excellent API, and its existing ecosystem (which proves sidecar file handling is possible). **Navidrome** serves as an excellent fallback for lightweight, audio-only deployments via the Subsonic API.

## 3. Proposed Integration Architecture

Instead of reinventing the wheel, Melodiq can evolve into a specialized **Frontend Client (PWA)** that connects to a user's existing Jellyfin or Navidrome instance.

### 3.1 The Media Backend (Jellyfin/Navidrome)

- **Role:** Source of truth for identity, authentication, media library indexing, and streaming.
- **Responsibility:** Serves the `.mp3`/`.mp4` media and associated `.txt`/`.usdx` files.

### 3.2 The Melodiq PWA (Frontend)

- **Role:** The Karaoke engine.
- **Responsibility:**
  1. **Authentication & Library:** Connects to the backend API, authenticates the user, and browses available songs.
  2. **USDB Parsing:** Downloads the associated `.txt` file and parses it entirely client-side (using Web Workers to prevent blocking).
  3. **Playback:** Streams the audio/video via HTML5 `<audio>`/`<video>`.
  4. **Mic Input & Pitch Detection:** Captures microphone input via `getUserMedia()`, processes pitch locally using the Web Audio API (e.g., Autocorrelation or YIN algorithm), and compares it against the parsed USDB notes.
  5. **Scoring:** Calculates scores locally based on pitch accuracy.

### 3.3 Data Association Strategy

To seamlessly link media with karaoke data, the PWA will rely on naming conventions.
For a given song `SongTitle - Artist.mp3` hosted on Jellyfin, the PWA will look for `SongTitle - Artist.txt` in the same directory or via a specific metadata tag.

## 4. Long-Term Benefits for Melodiq

Shifting Melodiq to act as a frontend/plugin for existing FOSS platforms provides significant strategic advantages:

1. **Reduced Infrastructure Burden:** No need to build, maintain, or scale a custom media server, transcoding engine, or database backend.
2. **Instant Library Access:** Users who already self-host music (via Jellyfin/Navidrome) can instantly turn their existing library into a karaoke library by simply dropping in USDB `.txt` files.
3. **Enhanced Features:** Native support for background videos (via Jellyfin) without writing complex video streaming logic.
4. **Offline Capabilities:** As a PWA, Melodiq can cache parsed `.txt` files and metadata (and potentially media, subject to quota limits) for offline playability.
5. **Privacy & Security:** Microphone audio is processed 100% locally in the browser via the Web Audio API. No voice data is ever sent to a server.
6. **Focus on Core Mechanics:** Development effort can be entirely redirected from backend plumbing to refining the karaoke experience: better pitch detection algorithms, smoother lyric animations, and more engaging scoring mechanics.

## 5. Summary of Effort

Refactoring Melodiq to this architecture involves:

- Implementing Jellyfin/Subsonic API clients in the frontend.
- Moving all USDB parsing to client-side Web Workers.
- Refining the Web Audio API pitch detection pipeline to run reliably in-browser across devices.
- Building a robust PWA shell for caching and offline support.

This approach transitions Melodiq from a standalone monolithic game into a highly versatile, easily deployable frontend that integrates gracefully with the self-hosted ecosystem.
