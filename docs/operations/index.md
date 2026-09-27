# Operations & DevOps Runbooks Index

This directory contains production operations runbooks, troubleshooting guides, incident response procedures, backup configurations, scaling guidelines, Capacitor Android deployment instructions, and standalone WebRTC tracker deployment runbooks.

## Production Runbooks

* [Server Runbook](server-runbook.md) - Production operations, secret rotation, CORS, and SSL setup for the companion server.
* [Android App (Capacitor) Packaging & Release Runbook](android-release.md) - Building, syncing, signing, and releasing the Android app via Capacitor.
* [Standalone WebRTC Tracker Deployment Runbook](webrtc-tracker.md) - Deployment, process management, and security constraints for the standalone BitTorrent WebRTC tracker.

## Reliability & Incident Response

* [Operational Backup & Recovery Procedures](backup-recovery.md) - Data retention, storage locations, IndexedDB / central storage replication, and disaster recovery.
* [Incident Response & Postmortem Guidelines](incident-response.md) - Protocols for handling operational incidents, escalation paths, and conducting postmortems.
* [Monitoring, Alerting, and Capacity Scaling](monitoring-scaling.md) - Resource profiles, CPU/memory limiting for PyTorch audio separation, and cluster scaling.
* [Production Troubleshooting & Diagnostics Guide](troubleshooting.md) - Diagnostic commands, CORS troubleshooting, and recovery checklists for common production issues.
