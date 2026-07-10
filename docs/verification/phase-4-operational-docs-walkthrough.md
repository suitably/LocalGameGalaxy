# Phase 4 Walkthrough: Operational & DevOps Documentation [ID: VERIFY-PHASE-4-OPS]

## Changes Implemented

Created a dedicated operational guide directory `docs/operations/` and populated it with 7 detailed runbooks and guides:

1. **#70 — Production Operations & Secret Rotation Runbook**
   - Location: `docs/operations/server-runbook.md`
   - Documented: Startup/shutdown, zero-downtime container rolling reloads, a detailed secret rotation playbook for the API Bearer Token, permitted CORS configurations (`ALLOWED_ORIGINS` setup), and manual loading of custom TLS/SSL PEM certificates.
2. **#71 — Android App (Capacitor) Packaging & Release Runbook**
   - Location: `docs/operations/android-release.md`
   - Documented: Java JDK/Android SDK env vars, Gradle compile steps (`./gradlew assembleRelease`), keystore generation (`keytool`), signing and aligning via `apksigner`, hardware back button verification steps, and WebView local SSL connection guidelines.
3. **#72 — Operational Backup & Recovery Procedures**
   - Location: `docs/operations/backup-recovery.md`
   - Documented: Backup scope mapping, automated backup script snippet for cron configuration, server config/playlists restore, browser-side Dexie IndexedDB JSON exports/imports, and complete disaster recovery scenario guidelines.
4. **#73 — Monitoring, Alerting, and Capacity Scaling Guide**
   - Location: `docs/operations/monitoring-scaling.md`
   - Documented: CPU/RAM/time resource profiles for background audio processing and PyTorch separation tasks, CPU/RAM container limits, disk/memory monitoring CLI commands, alerting threshold criteria, and single-instance worker queue guidelines.
5. **#74 — Incident Response & Postmortem Guidelines**
   - Location: `docs/operations/incident-response.md`
   - Documented: Outage severity classification (Sev-1 to Sev-3), triage protocols, escalation pathway templates, and a standard postmortem/RCA template.
6. **#75 — Standalone WebRTC Tracker Deployment Runbook**
   - Location: `docs/operations/webrtc-tracker.md`
   - Documented: local tracker operations, starting/stopping commands, custom port configuration via environment variables, PM2 daemon setup, docker-compose snippets, and Nginx WSS reverse proxy guidelines for mixed-content SSL bypass.
   - Code Fix: Modified `scripts/start-tracker.js` to bind to port from `process.env.PORT` or `process.env.TRACKER_PORT` instead of hardcoding `8000`.
7. **#76 — Production Troubleshooting & Diagnostics Guide**
   - Location: `docs/operations/troubleshooting.md`
   - Documented: Diagnostic checklists and recovery recipes for CORS policy blocks, audio separator OOM container crashes, WebRTC pairing failures, SSL invalid certificate warnings on mobile devices, and IndexedDB version mismatches.

---

## Verification Results

| Check | Result |
|-------|--------|
| `npm run build` | ✅ Successful (0 errors) |
| `npm run lint` | ✅ Successful (0 errors, 390 pre-existing warnings) |
| Standalone Tracker Port Config | ✅ Verified that `PORT` environment variable binds properly |
| GitHub Issues #70–#76 | ✅ All 7 closed |
| `docs/operations/` Directory | ✅ Index and 7 operational documents successfully created |

---

## Outstanding Issues
None. All Phase 4 issues have been successfully resolved.
