# Production Operations & Secret Rotation Runbook [ID: OPS-SERVER-RUNBOOK]

This guide covers production operations, security token rotation, CORS configurations, and SSL certificate management for the companion Node.js server.

---

## 1. Server Configuration & Architecture

The production server is deployed via Docker Compose or node process on the host.

### File Locations
- **Active Configuration**: `server/config.json` (untracked, contains SSL keys and security token).
- **Playlists Storage**: `playlists.json` (stored in the server execution directory).
- **Music & Stems Folder**: `/server/music/` (or configured directory).

---

## 2. Startup, Shutdown, and Updates

### Starting the Server
```bash
# Start in background
docker compose up -d

# Start dev-compose
docker compose -f docker-compose.dev.yml up -d
```

### Stopping the Server
```bash
docker compose down
```

### Zero-Downtime Updates (Rolling Reload)
Since local game rooms require active WebSocket connections, standard restarts will briefly drop clients. To minimize impact:
1. Re-build the new image in the background:
   ```bash
   docker compose build server
   ```
2. Reload the server container utilizing docker-compose rolling restart:
   ```bash
   docker compose up -d --no-deps --build server
   ```

---

## 3. Secret Rotation Playbook: Security Token

The Melodiq companion server relies on a master security token (`Bearer token`) in `config.json` to authorize administrative API requests (e.g. initiating song downloads, triggers, and audio separation).

### Step-by-Step Rotation Procedure

1. **Generate a new secure cryptographically strong token**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   # Output: e.g. "a4b1c2d3e4f5..."
   ```

2. **Update the configuration**:
   Open `config.json` and replace the existing `securityToken` value:
   ```json
   {
     "securityToken": "NEW_GENERATED_TOKEN_HEX",
     "port": 3000
   }
   ```

3. **Reload the Server**:
   To apply the new token, reload the server process:
   ```bash
   docker compose restart server
   ```
   *Note: Active client connections will temporarily get a `401 Unauthorized` until they scan the newly generated QR pairing code containing the updated token.*

4. **Verify the new token**:
   Test authorization with a curl request:
   ```bash
   curl -k -H "Authorization: Bearer NEW_GENERATED_TOKEN_HEX" https://localhost:3000/api/songs
   ```
   It should return a `200 OK` HTTP status.

---

## 4. Configuring CORS (`ALLOWED_ORIGINS`)

To prevent unauthorized cross-origin sites from querying your local media helper, configure the `ALLOWED_ORIGINS` CORS filter.

### Configuration Matrix

In `config.json`, configure the array of permitted HTTP origins:

| Origin Setting | Use Case | Security Level |
|----------------|----------|----------------|
| `["*"]` | Local LAN testing, client dev modes. | Low (vulnerable to CSRF if exposed to WAN) |
| `["https://nexumia.de", "https://localhost:5173"]` | Strict production. Limits API access only to the official Host client domains. | High |

Example `config.json` configuration:
```json
{
  "allowedOrigins": [
    "https://nexumia.de",
    "https://localhost:5173"
  ]
}
```

---

## 5. Manual SSL/TLS Certificate Setup

To configure custom, non-auto-generated SSL certificates (e.g. from an internal PKI or Let's Encrypt):

1. Obtain your private key (`privkey.pem`) and certificate chain (`fullchain.pem`).
2. Read the files and paste their contents into `config.json` as string variables:
   ```json
   {
     "ssl": {
       "key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD...",
       "cert": "-----BEGIN CERTIFICATE-----\nMIIFdzCCBF+gAwIBAgISBJ1vYvU4/8X/4Qx9iXpQ4CqyMA0GCSqG..."
     }
   }
   ```
3. Restart the server. The server will now serve HTTPS utilizing these custom credentials instead of generating a temporary self-signed key pair on boot.
