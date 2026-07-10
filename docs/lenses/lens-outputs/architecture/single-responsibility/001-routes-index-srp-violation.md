---
title: "[HIGH] Bloated Router in routes/index.js Violates Single Responsibility Principle"
severity: high
type: maintainability
domain: backend
lens: single-responsibility
labels:
  - "audit:architecture/single-responsibility"
---

## Summary
The main router file [server/src/routes/index.js](file:///home/deck/Projects/LocalGameGalaxy/server/src/routes/index.js) mixes multiple distinct architectural concerns, serving as route registration, route handler (controllers), HTML template parsing and view rendering, file system modifications (uploads, deletions, modifications), third-party CLI wrapper executions, configuration mutating actions, and task scheduling.

## Impact
This violates the Single Responsibility Principle (SRP) because the file has many reasons to change (e.g. changing UI templates, changing how API keys are verified, changing how `yt-dlp` works, or changing database and directory layouts). This makes the router fragile, difficult to read, and impossible to unit test in isolation without heavy mocking.

## Evidence
- **View Rendering & Template Injection:** Lines 85-122 serve `login.html` and `index.html` by reading files and performing string replacements:
  ```javascript
  const dirListHtml = config.directories.map(dir => `
      <li class="dir-item">
          <span class="dir-path">${dir}</span>
          <button class="danger" onclick="removeDir('${dir.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')">Remove</button>
      </li>
  `).join('');
  html = html
      .replace(/\{\{AUTH_TOKEN\}\}/g, injectedToken)
      .replace(/\{\{DIRECTORIES\}\}/g, dirListHtml)
  ```
- **CLI Executions:** Lines 133-146 directly run `yt-dlp` to resolve and stream video URLs:
  ```javascript
  const directUrl = await spawnYtDlp(ytBin, [
      '-g',
      '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      targetPath
  ]);
  ```
- **Filesystem & Metadata mutations:** Lines 225-259 handle deleting files, and lines 286-317 process incoming multer video files, read and parse UltraStar TXT files, filter video tags, and rewrite them.
- **Config & API Key Management:** Lines 670-704 manage API key persistence and properties by directly calling mutating functions on the imported `config` object.
- **Job States & Queues:** Lines 464-494 and 587-611 declare and process download and separation jobs/queues locally.

## Recommended Fix
Refactor [server/src/routes/index.js](file:///home/deck/Projects/LocalGameGalaxy/server/src/routes/index.js) by delegating responsibilities:
1. **Controllers:** Move route handlers to separate controller files (e.g., `controllers/songController.js`, `controllers/configController.js`, `controllers/jobController.js`). The router should only map paths to these controllers.
2. **Streaming Service:** Move `yt-dlp` CLI executions to a dedicated streaming service.
3. **Queue Manager Service:** Extract `DOWNLOAD_JOBS` and `SEPARATOR_JOBS` array management and process calls to a dedicated worker/queue service.
4. **View Controller:** Delegate template rendering to a separate view engine or static page rendering controller.

## References
- Clean Architecture (Robert C. Martin)
- Single Responsibility Principle (SOLID)

## Validation
- attacker_source: n/a
- missing_guard: n/a
- sink_effect: n/a
- preconditions: none
- proof_anchors: server/src/routes/index.js:85-122, server/src/routes/index.js:133-146, server/src/routes/index.js:286-317
- suggested_validation: grep -n "spawnYtDlp" server/src/routes/index.js
