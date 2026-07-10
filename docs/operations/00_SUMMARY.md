# Operational & DevOps Documentation Index [ID: DOCS-OPERATIONS-SUMMARY]

This directory contains production operations runbooks, troubleshooting guides, incident response procedures, backup configurations, scaling guidelines, Capacitor Android deployment instructions, and standalone WebRTC tracker deployment runbooks.

## Runbooks & Playbooks

- [Server Runbook](file:///home/deck/Projects/LocalGameGalaxy/docs/operations/server-runbook.md): Production operations, secret rotation, CORS, and SSL setup for the companion server. (Resolves #70)
- [Android Release Guide](file:///home/deck/Projects/LocalGameGalaxy/docs/operations/android-release.md): Building, syncing, signing, and releasing the Android app via Capacitor. (Resolves #71)
- [Backup & Recovery Procedures](file:///home/deck/Projects/LocalGameGalaxy/docs/operations/backup-recovery.md): Data retention, storage locations, IndexedDB / localStorage replication, and disaster recovery. (Resolves #72)
- [Monitoring & Scaling Guide](file:///home/deck/Projects/LocalGameGalaxy/docs/operations/monitoring-scaling.md): Resource utilization, CPU/memory limiting for PyTorch/Demucs separation, and cluster scaling. (Resolves #73)
- [Incident Response Framework](file:///home/deck/Projects/LocalGameGalaxy/docs/operations/incident-response.md): Incident triaging, escalation contacts, outages management, and postmortem templates. (Resolves #74)
- [WebRTC Tracker Guide](file:///home/deck/Projects/LocalGameGalaxy/docs/operations/webrtc-tracker.md): Configuring, running, and managing the standalone signaling WebSocket tracker. (Resolves #75)
- [Troubleshooting & Diagnostics Guide](file:///home/deck/Projects/LocalGameGalaxy/docs/operations/troubleshooting.md): Diagnosis checklists, error states, SSL handshake faults, CORS errors, OOM crashes, and database locking. (Resolves #76)
