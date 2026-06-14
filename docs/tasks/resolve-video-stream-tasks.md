# Tasks: Resolve Video Stream & YT-DLP Errors

- [x] Update server/Dockerfile base image to `node:20-bookworm-slim` <!-- id: 0 -->
- [x] Refactor `spawnYtDlp` in `server/src/services/download.js` to separate stdout and stderr and export it along with `ensureYtDlp` <!-- id: 1 -->
- [x] Update `server/src/services/scanner.js` to allow remote HTTP/HTTPS URLs in `getServeUrl` <!-- id: 2 -->
- [x] Implement YouTube direct streaming URL redirection in `/media` endpoint in `server/src/routes/index.js` <!-- id: 3 -->
- [ ] Rebuild server and verify correctness <!-- id: 4 -->
