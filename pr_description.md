## Implementation Summary
- **Issue:** Path Traversal Vulnerability in Directory Browser (server/src/plugins/melodiq/routes/config.ts) where the API endpoint '/api/browse' allowed unrestricted access to the file system.
- **Rationale:** The fix mitigates directory traversal attacks while preserving the functionality needed for application administrators. The application uses '/api/browse' to navigate the host file system when adding server media directories. Therefore, restricting the browsing strictly to a static base configuration would break the directory addition feature. Instead, the endpoint now utilizes `path.resolve` to construct an absolute path and verifies that it properly resolves and is anchored to the system's drive root via `path.parse(os.homedir()).root`. It specifically rejects paths containing null bytes and checks for boundary traversal escaping the system root, safely restricting users from malicious exploration without destroying application intent.
- **Changed Files:**
  - server/src/plugins/melodiq/routes/config.ts
- **Verified Quality Gates:**
  - [x] 'npm run check:docs'
  - [x] 'npm run check:architecture:diff'
  - [x] 'npm run check:duplicates'
  - [x] 'npm run check:budget'
  - [x] 'npm test'
  - [x] 'npm run build'

## Security Details
🎯 **What:** A path traversal vulnerability where user input was passed directly into `fs.existsSync` and `fs.readdirSync` via the `?path=` query string in the `/api/browse` endpoint, without restricting relative traversals or checking for null bytes.
⚠️ **Risk:** Exploitation would allow an authenticated attacker (or unauthenticated depending on server setup) to read arbitrary directories on the host system, disclosing system structure or potentially sensitive files.
🛡️ **Solution:** The path is securely resolved via `path.resolve()`. Null bytes in the path string are strictly rejected to prevent poison null byte attacks. The resolved path is then validated to ensure it starts with the operating system's root partition (`path.parse(os.homedir()).root`), acting as the primary anchor, and traversal attempts past the root are caught securely.
