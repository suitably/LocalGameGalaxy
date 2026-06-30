# Flexible Rate Limiting Implementation Plan

## Goal Description
The current rate limit implementation uses a fixed 15-minute window with a configurable max limit per API key. To provide the greatest customizability for administrators, we will implement multiple rate limit constraints (per second, per minute, and per hour) that can be individually configured for each API key.

## Proposed Changes

### Configuration Backend
#### [MODIFY] `server/config.js`
- Change `createApiKey` and `updateApiKey` to accept three new properties: `rateLimitSecond`, `rateLimitMinute`, and `rateLimitHour`, instead of the single `rateLimit`.

#### [MODIFY] `server/src/routes/index.js`
- Update the `POST /api/config/apikeys` and `PUT /api/config/apikeys/:id` endpoints to parse and pass the new time-based rate limit fields.

### Rate Limit Middleware
#### [MODIFY] `server/src/middleware/auth.js`
- Replace the single `express-rate-limit` instance with three separate instances:
  1. **Per Second Limiter**: 1-second window.
  2. **Per Minute Limiter**: 60-second window.
  3. **Per Hour Limiter**: 3600-second window.
- Chain these limiters sequentially in the `rateLimitMiddleware` function.
- Configure the `skip` condition for each limiter so that it is bypassed if the API key does not have a limit defined for that specific timeframe, ensuring maximum flexibility (e.g., you can limit an API key to 10 requests per second but have no hourly limit).

### Frontend UI
#### [MODIFY] `server/public/index.html`
- Update the "Generate New API Key" form to include three smaller input fields for `Req/Sec`, `Req/Min`, and `Req/Hour` instead of a single `Rate Limit` input.
- Update the API keys table to display three inputs for the three limits.
- Update the `updateApiKeySettings` and `createApiKey` Javascript functions to collect and send the three new values to the API.

## Verification Plan
### Manual Verification
- Generate a new API key with a strict limit (e.g., 2 requests per second).
- Fire 3 rapid requests to the `/api/songs` endpoint using the new key.
- Verify that the first two succeed and the third returns a `429 Too Many Requests` error.
- Verify that waiting 1 second and retrying succeeds.
- Confirm that the UI correctly saves and displays the updated rate limits.
