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
3. Check the companion server logs:
   ```bash
   docker compose logs server
   ```
   Look for `[CORS] Rejected origin: ...`.

### Mitigation Steps
1. Update `config.json` on the server and check that `allowedOrigins` includes the exact protocol, port, and domain of the client UI.
2. Example of a correct configuration permitting both localhost and production:
   ```json
   {
     "allowedOrigins": ["https://localhost:5173", "https://nexumia.de"]
   }
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
1. **Reduce CPU thread count**: In `/server/src/services/separator.js`, configure Demucs to use fewer threads to lower memory footprint.
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
1. Clear browser database storage to force a clean database re-initialization (see [onboarding-faq.md](file:///home/deck/Projects/LocalGameGalaxy/docs/tech/onboarding-faq.md#3-indexeddb--dexie-schema-lockups)).
2. Ensure you have incremented the Dexie schema version number in `src/lib/db.ts` when adding new tables.
