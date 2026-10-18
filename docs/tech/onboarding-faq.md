---
type: Howto
title: 'Developer onboarding FAQ'
description: 'Fixes for common local-setup problems: secure context for phones (tunnel instead of self-signed certs), phones not connecting (tracker, firewall), IndexedDB schema errors, and the Python stack for separation/alignment.'
tags: [onboarding, faq, https, webrtc, indexeddb, python]
status: stable
generated:
  at: 2026-10-18T15:00:00+02:00
  by: claude-code
verified:
  at: 2026-10-18
  method: 'compared with server/src/config.ts, server/src/plugins/melodiq/services/separator.ts, vite.config.ts, db files'
sources:
  - 'merged from: previous version of 2026-09-27'
---

# Developer Onboarding FAQ & Troubleshooting Guide

This document contains solutions to common issues encountered when setting up the LocalGameGalaxy local development environment.

---

## 1. Secure context (HTTPS) for phones

### Why?

Microphone, WebRTC and service workers require a secure context. `http://localhost` is secure; `http://192.168.x.y:5173` on a phone is not.

### What works

- Neither Vite (`vite.config.ts` has no `https`) nor the companion server serve TLS. Self-signed certificates are no longer part of the setup.
- Use the companion server's **Cloudflare Quick Tunnel** (`ENABLE_TUNNEL=true` or `--tunnel`) or a reverse proxy with a real certificate — see [secrets-management §4](secrets-management.md#4-https-for-phones).
- For UI-only work on a desktop browser, `http://localhost:5173` is enough.

## 2. WebRTC & Peer-to-Peer Signaling Issues

### Why won't my phone connect to the TV screen?

1. **Network Connectivity**: Ensure both the host computer (TV/Host mode) and the mobile phone are connected to the **same local Wi-Fi network**.
2. **Local Tracker**: Verify that the local WebRTC signaling tracker is running:
   ```bash
   # Check if port 8000 (or your configured tracker port) is listening
   netstat -tuln | grep 8000
   ```
3. **Firewall Block**: Firewalls on your development computer might block incoming signaling tracker or WebSocket traffic. Temporarily disable the firewall or add rules allowing incoming UDP/TCP traffic on ports `8000`, `3000` (server), and `5173` (Vite).
4. **Public Trackers**: If not using a local tracker, SimplePeer relies on public BitTorrent trackers. If your internet provider blocks torrent traffic, signaling will fail. Use the local tracker (`npm run tracker`) instead.

---

## 3. IndexedDB & Dexie Schema Lockups

### I changed a database schema, and now the app is locked up or throwing errors.

IndexedDB schemas are cached in the browser. When you modify a Dexie database schema in the code during development, you might encounter database version mismatches or schema conflicts.
To resolve this:

1. Open your browser Developer Tools (F12).
2. Go to the **Application** (Chrome/Edge) or **Storage** (Firefox) tab.
3. Select **IndexedDB** in the sidebar.
4. Locate the relevant database (`MelodiqDB`, `MelodiqNotesDB`, `ImposterDB`, `guessart-local`, `storyteller-local`, `galaxy_tabletop_db` — see [persistence §2](persistence.md#2-indexeddb-databases)).
5. Click **Delete Database**.
6. Refresh the page to trigger the new seeder scripts and initialize the database with the updated schema.

---

## 4. Python stack for separation and alignment

### `audio-separator` / `whisper_timestamped` not found

There is no `requirements.txt`. The server installs what it needs itself:

- `GET /api/separator/status` tells whether the stack is present; `POST /api/separator/install` runs `pip3 install` for CPU-only PyTorch, `audio-separator[cpu]` and `whisper-timestamped` (with `--break-system-packages` on system-managed Pythons such as Debian/Fedora).
- Or use the Docker `full` image, which has everything pre-installed.

### Separation or download fails immediately

- `ffmpeg` must be on `PATH` (`sudo apt-get install ffmpeg`, `sudo dnf install ffmpeg`, `brew install ffmpeg`).
- `yt-dlp` is located or auto-installed by `services/download.ts`; if that fails, install it manually and restart the server.
