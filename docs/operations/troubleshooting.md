---
type: Troubleshooting Guide
title: Production Troubleshooting & Diagnostics Guide
description: Diagnostic commands, common failure modes, CORS issues, and recovery checklists for LocalGameGalaxy.
resource: docs/operations/
tags: [troubleshooting, diagnostics, operations, faq]
status: stable
generated:
  at: 2026-09-27T10:00:00Z
  by: previous-agent
verified:
  at: 2026-10-18
  method: '2026-10-18 audit: paths, links and identifiers resolved against code, content spot-checked; prose not re-verified line by line'
---

# Production Troubleshooting & Diagnostics Guide [ID: OPS-TROUBLESHOOTING]

This guide provides troubleshooting paths, diagnostic commands, and recovery checklists for common production issues and failure modes in LocalGameGalaxy.

---

## 1. CORS Policy Blocks API Requests

### Symptom

The React client UI loads, but actions (e.g. searching songs, fetching lists, or starting downloads) fail. The browser console displays:
`Access to fetch at 'https://...' from origin 'https://...' has been blocked by CORS policy.`

### Diagnostic Steps

1. Open browser Developer Tools (F12) -> **Network** tab.
2. Inspect the failed HTTP request. Look at the `Access-Control-Allow-Origin` response header.
3. The server does not log CORS rejections; a missing `Access-Control-Allow-Origin` header on the response is the signal. Check the environment of the server container:
   ```bash
   docker compose exec melodiq-server printenv ALLOWED_ORIGINS
   ```

### Mitigation Steps

1. `ALLOWED_ORIGINS` (env, comma-separated) must contain the exact scheme, host and port of the client UI — or be unset to allow any origin. localhost and private-network origins are always allowed ([server-security §5](../tech/server-security.md#5-cors-and-private-network-access)).
2. Example (compose `environment:`):
   ```yaml
   - ALLOWED_ORIGINS=https://nexumia.de,https://staging.example.org
   ```
3. Restart the server.

---

## 2. Server Crashes during Audio Separation (OOM)

### Symptom

Vocal separation starts (progress bar updates), but suddenly stops. The companion server container crashes, exits, or restarts automatically.

### Diagnostic Steps

1. Inspect the kernel logs on the host to check if the OS killed the process due to memory exhaustion:
   ```bash
   dmesg -T | grep -i oom
   ```
   Look for output containing `Killed process (node)` or `audio-separator`.
2. Inspect container exit codes:
   ```bash
   docker compose ps -a
   ```
   Exit code `137` indicates the container was terminated by the OOM killer (out of memory).

### Mitigation Steps

1. **Limit the container**: `separator.ts` passes no thread option to `audio-separator`; cap CPU/RAM with compose `deploy.resources.limits` (see [monitoring-scaling](monitoring-scaling.md)) and run one separation job at a time.
2. **Increase Swap Space**: On resource-constrained host machines (e.g., 2GB RAM), add swap space to handle PyTorch spikes:
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```
3. **Queue Enforcement**: Confirm that only one separation task is executing at a time. Do not invoke separator scripts manually bypass-queues.

---

## 3. WebRTC Peer Pairing Failures

### Symptom

The TV/Host QR code displays, but the phone client hangs at "Connecting..." or shows "Connection lost" immediately.

### Diagnostic Steps

1. Verify both devices are on the **same subnet** (e.g. Host on `192.168.1.10` and Phone on `192.168.1.15`).
2. Verify tracker accessibility by opening the tracker address in the phone's browser: `http://<host-ip>:8000`. If it fails to resolve, a network/firewall is blocking port `8000`.

### Mitigation Steps

1. **Add Firewall Rules**: Open incoming ports on the host machine:
   ```bash
   # Linux (ufw)
   sudo ufw allow 3000/tcp
   sudo ufw allow 8000/tcp
   sudo ufw allow 5173/tcp
   ```
2. **Configure STUN Servers**: In firewalled LAN networks, ensure the WebRTC manager configuration includes local STUN servers if Google's public STUN is blocked.

---

## 4. SSL Handshake Warnings in Mobile WebView

### Symptom

The Android Capacitor app starts but is stuck on a blank screen or cannot communicate with the companion server API.

### Diagnostic Steps

1. Connect the phone via USB and open Chrome on your computer: `chrome://inspect`.
2. Find the target WebView instance, click **Inspect**, and check the console.
3. Look for: `ERR_CERT_AUTHORITY_INVALID` or `ERR_CERT_COMMON_NAME_INVALID`.

### Mitigation Steps

1. The Android WebView blocks self-signed certificates. You must add the self-signed certificate authority (CA) root to the Android system trust store (Settings -> Security -> Install from storage -> CA certificate).
2. Alternatively, configure the companion server to use a certificate matching a real domain name (e.g. using Let's Encrypt certificates mapped to a local DNS record).

---

## 5. Dexie / IndexedDB Migration Failures

### Symptom

App hangs on startup. Console logs show database schema upgrade errors or version lockouts.

### Diagnostic Steps

1. Open Console (F12) -> Check if `DexieError` occurs with message `VersionChangeError` or `UpgradeError`.

### Mitigation Steps

1. Clear browser database storage to force a clean database re-initialization (see [onboarding-faq.md](../tech/onboarding-faq.md#3-indexeddb--dexie-schema-lockups)).
2. Ensure you added a new `db.version(n+1)` block in the game's `db.ts` (e.g. `src/games/melodiq/db.ts`) instead of editing an existing version ([persistence §2](../tech/persistence.md#2-indexeddb-databases)).
