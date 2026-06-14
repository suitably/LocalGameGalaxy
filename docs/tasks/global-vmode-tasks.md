# Task Tracking - Global Default Video Mode Selector [ID: GLOBAL-VMODE-TASKS]

Checklist to track implementation of the global default video mode selector in USDB Song Manager.

- [x] Replace `🎬 Video` table header with global select dropdown `global-vmode` <!-- id: 1 -->
- [x] Implement `changeGlobalVideoMode(val)` in javascript to sync dropdowns, Map, and localStorage <!-- id: 2 -->
- [x] Update page load initialization to read from `localStorage` and set `manual-vmode` and `global-vmode` <!-- id: 3 -->
- [x] Update `renderUsdbResults` to initialize rows with the current global/default video mode <!-- id: 4 -->
- [x] Perform verification and document results in walkthrough <!-- id: 5 -->
