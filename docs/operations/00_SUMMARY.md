# Operational & DevOps Documentation Index

This directory contains production operations runbooks, troubleshooting guides, incident response procedures, backup configurations, scaling guidelines, Capacitor Android deployment instructions, and standalone WebRTC tracker deployment runbooks.

## Runbooks & Playbooks

* [Server Runbook](server-runbook.md): Production operations, secret rotation, CORS, and SSL setup for the companion server.
* [Android Release Guide](android-release.md): Building, syncing, signing, and releasing the Android app via Capacitor.
* [Backup & Recovery Procedures](backup-recovery.md): Data retention, storage locations, IndexedDB / central storage replication, and disaster recovery.
* [Monitoring & Scaling Guide](monitoring-scaling.md): Resource profiles, CPU/memory limiting for PyTorch/Demucs separation, and cluster scaling.
* [Production Troubleshooting & Diagnostics Guide](troubleshooting.md): Diagnostic commands, CORS troubleshooting, and recovery checklists for common production issues.
* [Incident Response & Postmortem Guidelines](incident-response.md): Protocols for handling operational incidents, escalation paths, and conducting postmortems.
* [Standalone WebRTC Tracker Deployment Runbook](webrtc-tracker.md): Deployment, configuration, process management, and security constraints for the standalone tracker.

For progressive disclosure, see [index.md](index.md).
