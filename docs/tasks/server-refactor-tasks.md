# Task Checklist - Server Refactoring

- [x] Create static presentation templates (`server/public/login.html`, `server/public/index.html`)
- [x] Implement utilities (`server/src/utils/helpers.js`, `server/src/utils/http.js`)
- [x] Implement services (`server/src/services/ssl.js`, `server/src/services/scanner.js`, `server/src/services/usdb.js`, `server/src/services/download.js`)
- [x] Implement middleware (`server/src/middleware/auth.js`)
- [x] Implement router (`server/src/routes/index.js`)
- [x] Update `server/index.js` to serve as the entry point
- [x] Update `server/package.json` pkg configurations
- [x] Verify the refactored server boots and works correctly
- [x] Fix duplicate CSS media query syntax error and event scope variables in `server/public/index.html`
