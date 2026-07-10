# Incident Response & Postmortem Guidelines [ID: OPS-INCIDENT-RESPONSE]

This document outlines the protocols for handling operational incidents, escalation paths, and conducting post-incident reviews (postmortems) for LocalGameGalaxy.

---

## 1. Severity Levels

| Severity | Impact | Example | Action |
|----------|--------|---------|--------|
| **Sev-1: Critical** | Core gameplay is entirely broken for all users. | Central WebRTC signaling tracker is down; companion server OOM crashes. | Immediate mitigation. On-call alert. |
| **Sev-2: Major** | Feature-specific failure affecting active users; workaround exists. | Lyric separation fails on specific YouTube videos; self-signed certificate expired. | Mitigate same-day. |
| **Sev-3: Minor** | Cosmetic bug or minor utility failure. | Translation typo; log warnings without functional impact. | Schedule fix in sprint. |

---

## 2. Incident Triage Procedures

In the event of an outage or error report during a session:

### Step 1: Detect & Verify
1. Attempt to reproduce the issue on a local device.
2. Check browser Developer Console (F12) for WebSocket connection errors or database transaction lockups.

### Step 2: Check Companion Server Status
Run diagnostics on the host:
```bash
# Check if container is running
docker compose ps

# Inspect logs for exceptions or OOM errors
docker compose logs -n 100 server
```

### Step 3: Check Tracker Accessibility
If client pairing fails:
- Run a ping check to the WebSocket tracker from both Host and Phone.
- Test connection to the local tracker: `curl http://localhost:8000`.

---

## 3. Escalation Pathways & Contacts

When an incident cannot be mitigated immediately by local operators:

1. **System Administrator / DevOps**: Issues related to Docker hosting, network port blocks, SSL certificate renewal.
2. **Core Developer**: Backend exceptions, database migration locks, frontend router errors.

### Communication Template
Use this template to report active Sev-1 / Sev-2 incidents:
```
INCIDENT ALERT: [Game Mode / Service affected]
SEVERITY: [Sev-1 / Sev-2]
STATUS: [Investigating / Identified / Mitigating]
IMPACT: [e.g., "All 5 players in room ROOM1 cannot stream mic audio"]
DIAGNOSTICS COMPLETED: [e.g., "Server logs show WebRTC candidate timeout"]
STEPS TAKEN: [e.g., "Restarted tracker container; issue persists"]
```

---

## 4. Post-Incident Review (Postmortem) Template

Every Sev-1 incident requires a postmortem conducted within 48 hours of resolution.

```markdown
# Incident Review: [Incident Title] (Date: YYYY-MM-DD)

## Summary
- **Severity**: Sev-1
- **Duration**: [XX minutes]
- **Impacted Users**: [Description of users affected]
- **Resolution**: [Short description of fix]

## Timeline
- **HH:MM**: Outage detected. Alert triggered.
- **HH:MM**: Operators start investigation.
- **HH:MM**: Root cause identified.
- **HH:MM**: Mitigation applied. Services restored.

## Root Cause Analysis (RCA)
- Why did the issue occur? [Detail the failure mode]
- Why was it not caught earlier?

## Action Items (Corrective & Preventative)
- [ ] Action item 1 (Owner: name, Deadline: date)
- [ ] Action item 2 (Owner: name, Deadline: date)
```
