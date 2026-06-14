# API Keys Tasks

- [x] Modify `server/config.js`
  - Add `apiKeys` to defaultConfig.
  - Implement `get apiKeys()`.
  - Implement `createApiKey(name)`.
  - Implement `deleteApiKey(id)`.
- [x] Modify `server/src/middleware/auth.js`
  - Update `requireAuth` to accept `apiKeys`.
  - Inject `req.isMasterToken` based on whether the token is the master token.
- [x] Modify `server/src/routes/index.js`
  - Add `GET /api/config/apikeys`.
  - Add `POST /api/config/apikeys`.
  - Add `DELETE /api/config/apikeys/:id`.
  - Ensure all routes verify `req.isMasterToken === true`.
- [x] Modify `server/public/index.html`
  - Add API Key Management card.
  - Implement JS functions to GET, POST, DELETE api keys.
  - Render keys in a list/table with Copy and Revoke buttons.
