# API Key Management

## Goal Description
Implement API management in the Melodiq Helper to allow generating and managing API Keys for other users or applications. This allows separating the Master Security Token from user-specific tokens, ensuring you don't have to share your persistent Master Token.

## User Review Required
> [!IMPORTANT]
> The Master Token (`config.token`) will be required to create or delete API Keys. API Keys will have access to all standard API routes (like browsing, downloading songs, and separating vocals), but they will NOT be allowed to manage API Keys themselves. 
> 
> Is this acceptable? Should API keys have more granular permissions in the future, or is full API access (excluding key management) sufficient for now?

## Proposed Changes

### Configuration
#### [MODIFY] `server/config.js`
- Add `apiKeys` to the default configuration as an empty array `[]`.
- Add a getter `get apiKeys()`.
- Add methods `createApiKey(name)` (generates a unique token string, stores an object `{ id, name, token, createdAt }`, and saves the config) and `deleteApiKey(id)` (filters the array and saves).

### Middleware
#### [MODIFY] `server/src/middleware/auth.js`
- Update `requireAuth` to validate the token against `config.token` OR any valid token stored in `config.apiKeys`.
- Inject a property `req.isMasterToken = (token === config.token)` to be used in routes that require elevated privileges.

### Routes
#### [MODIFY] `server/src/routes/index.js`
- Add `GET /api/config/apikeys`: Returns the list of API Keys.
- Add `POST /api/config/apikeys`: Creates a new API Key with `req.body.name`.
- Add `DELETE /api/config/apikeys/:id`: Deletes an API Key by its ID.
- Secure these management routes by explicitly checking if `req.isMasterToken` is true. If false, return a 403 Forbidden error.

### Frontend UI
#### [MODIFY] `server/public/index.html`
- Add an "API Key Management" card below the main security token section.
- Display a table or list of active API Keys with their Names and a button to copy the token.
- Add a text input and a "Generate New API Key" button to allow the host to create keys.
- Add a "Revoke" button for each key to delete it.
- Add the necessary frontend JavaScript functions to communicate with the new endpoints.

## Verification Plan

### Manual Verification
1. Start the server and load the Helper UI using the Master Token.
2. In the UI, generate a new API Key named "Guest User".
3. Verify the new key appears in the list and its token can be copied.
4. Open a new incognito window (or use curl/postman) and attempt to access `/api/songs?token=<NEW_API_KEY>`. Verify it returns the song list successfully.
5. Attempt to access `/api/config/apikeys?token=<NEW_API_KEY>` (the management route) using the new key. Verify it returns `403 Forbidden`.
6. Delete the API Key from the UI.
7. Attempt to use the deleted key again, and verify it returns `401 Unauthorized`.
