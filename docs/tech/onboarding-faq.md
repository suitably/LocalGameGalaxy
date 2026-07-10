# Developer Onboarding FAQ & Troubleshooting Guide [ID: TECH-ONBOARDING-FAQ]

This document contains solutions to common issues encountered when setting up the LocalGameGalaxy local development environment.

---

## 1. Local SSL/HTTPS & Certificate Warnings

### Why do I need HTTPS/SSL locally?
Modern browsers enforce secure contexts for several Web APIs (WebRTC, Web Audio, and Microphone Access). These APIs will fail silently or throw security exceptions if the app is loaded over unencrypted HTTP (except on `localhost`). When testing on actual mobile phones connected to your local network, the app must serve HTTPS.

### How do I bypass the "Your connection is not private" warning in my browser?
Since development certificates are self-signed:
1. When loading the React frontend or companion server (e.g. `https://localhost:3000`), click **Advanced** or **Show Details** on the warning page.
2. Select **Proceed to localhost (unsafe)** or **Accept the Risk and Continue**.
3. **Important**: You must load both the client URL (e.g., `https://localhost:5173`) and the companion server API URL (e.g., `https://localhost:3000`) in separate browser tabs at least once to accept both certificates, otherwise the client cannot make fetch requests to the companion server API.

---

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
4. Locate the LocalGameGalaxy database (e.g., `LocalGameGalaxyDB` or `MelodiqDB`).
5. Click **Delete Database**.
6. Refresh the page to trigger the new seeder scripts and initialize the database with the updated schema.

---

## 4. Python Audio Processing & Alignment Pitfalls

### I get `ModuleNotFoundError` (e.g. `auditok` or `difflib` missing) when running alignment scripts.
The audio processing pipeline uses Python scripts that depend on external libraries.
1. **Virtual Environment**: It is highly recommended to run these scripts within a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
2. **Missing system packages**: If vocal separation (using PyTorch/Demucs) fails, ensure you have `ffmpeg` installed on your system path.
   - *Linux*: `sudo apt-get install ffmpeg`
   - *macOS*: `brew install ffmpeg`
