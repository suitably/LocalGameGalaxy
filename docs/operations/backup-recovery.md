# Operational Backup & Recovery Procedures [ID: OPS-BACKUP-RECOVERY]

This document details the backup mechanisms, retention policies, and recovery procedures for LocalGameGalaxy configurations, playlists, and browser-side IndexedDB databases.

---

## 1. Backup Scope & Locations

The application stores data on both the server and client hosts. The following elements must be backed up:

| Scope | Data Type | Location | Backup Strategy |
|-------|-----------|----------|-----------------|
| **Server** | Credentials & SSL keys | `server/config.json` | File backup (manual/automation) |
| **Server** | User playlists data | `playlists.json` | File backup (automated job) |
| **Server** | Downloaded media stems | `server/music/` | Directory backup |
| **Client** | Game states, custom roles, word categories | IndexedDB (`LocalGameGalaxyDB`, `MelodiqDB`) | Export to JSON file via Dexie |
| **Client** | App preferences, themes | `localStorage` | Serialized JSON file export |

---

## 2. Server-Side Backup & Restore Procedures

### Automated Backup Script
Run this script hourly/daily on the host to create snapshots:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/localgamegalaxy"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# Backup configurations
cp /app/server/config.json "$BACKUP_DIR/config_$TIMESTAMP.json"
cp /app/playlists.json "$BACKUP_DIR/playlists_$TIMESTAMP.json"

# Compress backups and clean up files older than 14 days
tar -czf "$BACKUP_DIR/stems_$TIMESTAMP.tar.gz" /app/server/music
find "$BACKUP_DIR" -type f -mtime +14 -delete
```

### Restore Procedure
1. Stop the active server container:
   ```bash
   docker compose down
   ```
2. Restore the configuration files:
   ```bash
   cp /var/backups/localgamegalaxy/config_2026xxxx.json /app/server/config.json
   cp /var/backups/localgamegalaxy/playlists_2026xxxx.json /app/playlists.json
   ```
3. Extract music stems:
   ```bash
   tar -xzf /var/backups/localgamegalaxy/stems_2026xxxx.tar.gz -C /
   ```
4. Start the server:
   ```bash
   docker compose up -d
   ```

---

## 3. Client-Side (Browser) Backup & Restore

Client-side data is stored in the browser's IndexedDB. Browser updates or disk clearing can wipe this data.

### Exporting Client Databases (Dexie)
Users can export their libraries and custom roles via the Settings UI (using `dexie-export-import`):
```typescript
import { exportDB } from "dexie-export-import";

async function backupDatabase(db) {
  const blob = await exportDB(db, { prettyJson: true });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${db.name}_backup.json`;
  a.click();
}
```

### Restoring Client Databases
To import a previously saved database file:
```typescript
import { importInto } from "dexie-export-import";

async function restoreDatabase(db, file) {
  await db.delete(); // Clear existing databases
  await db.open();
  await importInto(db, file, {
    overwriteValues: true,
    clearDatabase: true
  });
}
```

### localStorage Backup
Preferences (themes, settings) can be dumped/loaded via JavaScript:
```javascript
// Backup
const preferences = JSON.stringify(localStorage);
// Restore
const data = JSON.parse(preferences);
Object.keys(data).forEach(key => localStorage.setItem(key, data[key]));
```

---

## 4. Disaster Recovery Plan

In the event of complete server failure:
1. Provision a new host instance with Docker installed.
2. Clone the repository and copy back the latest `config.json` and `playlists.json` from backups.
3. If music backups are unavailable, users must re-download songs from the interface. The metadata and playlists will load cleanly from `playlists.json`.
4. Instruct users to reload their browsers. If database schemas get stuck, prompt them to run "Clear Database" (triggering the Dexie deletion and automatic seeding script).
