# Tasks: Melodiq Lyrics Timing & Lead-In Modernization [ID: TASKS-MELODIQ-LYRICS-TIMING]

- [x] 1. Architecture & Design Preparation <!-- id: task-1 -->
    - [x] Analyze current `LyricsDisplay.tsx` timing limitations <!-- id: task-1-1 -->
    - [x] Create implementation plan & task checklist <!-- id: task-1-2 -->
- [x] 2. Implementation in `LyricsDisplay.tsx` <!-- id: task-2 -->
    - [x] Refactor line grouping and active/preview index calculation (0.8s linger + instant advance) <!-- id: task-2-1 -->
    - [x] Create `LeadInIndicator` component for 3-2-1 beat countdown dots & break indicator <!-- id: task-2-2 -->
    - [x] Refactor `LyricsLine` for stable typography, syllable highlighting, and zero CLS <!-- id: task-2-3 -->
    - [x] Verify independent multi-track support in duet split mode <!-- id: task-2-4 -->
- [x] 3. Verification & Testing <!-- id: task-3 -->
    - [x] Run `npm run lint` <!-- id: task-3-1 -->
    - [x] Run `npm run build` <!-- id: task-3-2 -->
    - [x] Validate timing behavior for solo, duet, and with/without pitch visualizer <!-- id: task-3-3 -->
- [x] 4. Documentation & Walkthrough <!-- id: task-4 -->
    - [x] Create `docs/verification/melodiq-lyrics-timing-walkthrough.md` <!-- id: task-4-1 -->
    - [x] Update `docs/planning/00_SUMMARY.md` & `docs/tasks/00_SUMMARY.md` <!-- id: task-4-2 -->
