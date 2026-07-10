---
title: "[MEDIUM] Bloated Audio Separator Service Violates Single Responsibility Principle"
severity: medium
type: maintainability
domain: backend
lens: single-responsibility
labels:
  - "audit:architecture/single-responsibility"
---

## Summary
The audio separator service [server/src/services/separator.js](file:///home/deck/Projects/LocalGameGalaxy/server/src/services/separator.js) contains several unrelated responsibilities. It is responsible for managing background queue states, executing host package management (pip3 package installation), running audio separator CLI programs, parsing/analyzing raw audio files via FFmpeg, and executing forced alignment python scripts while parsing and shifting timing values in UltraStar TXT files.

## Impact
This compilation of concerns makes the separator service fragile and difficult to extend. Changing how third-party dependencies are installed, changing how audio timing silence is calculated, changing the forced alignment script format, or modifying the UltraStar TXT notes parser requires changing this single service.

## Evidence
- **Environment & Dependency Installation:** Lines 37-107 (`runInstallJob`) call `pip3 install --break-system-packages torch torchvision torchaudio...` to configure PyTorch and other dependencies on the host system.
- **Audio Separator Execution:** Lines 152-185 spawn `audio-separator` CLI commands.
- **FFmpeg Silence Boundary Detection:** Lines 342-408 spawn `ffmpeg -af silencedetect` and parse the CLI logs to determine the start offset of vocals.
- **USDX TXT Parsing & Timing adjustments:** Lines 413-468 read the song text file, parse BPM and note attributes via custom regexes (e.g. `[:*FRG]`), perform mathematical calculation on the Gap, rewrite it, and save the file:
  ```javascript
  const msPerBeat = 60000 / (bpm * 4);
  const theoreticalStartMs = firstNoteStartBeat * msPerBeat;
  const newGap = Math.round(vocalsStartMs - theoreticalStartMs);
  ```
- **Alignment Script Execution:** Lines 580-611 spawn `align_lyrics.py` to run forced alignment.

## Recommended Fix
Decompose [server/src/services/separator.js](file:///home/deck/Projects/LocalGameGalaxy/server/src/services/separator.js) into dedicated modules:
1. **SystemSetupManager:** Move system pip dependency checks and installations into a dedicated module/scripts runner.
2. **AudioAnalysisService:** Extract the `ffmpeg silencedetect` parser logic to analyze silence boundaries.
3. **UltraStarTxtParser:** Extract the UltraStar file reading, parsing, BPM/Gap calculation, and writing routines into a clean parser helper.
4. **LyricsAlignerService:** Manage the Python execution logic of `align_lyrics.py` separately.

## References
- Single Responsibility Principle (SOLID)

## Validation
- attacker_source: n/a
- missing_guard: n/a
- sink_effect: n/a
- preconditions: none
- proof_anchors: server/src/services/separator.js:37-107, server/src/services/separator.js:342-408, server/src/services/separator.js:413-468
- suggested_validation: grep -n "ffmpeg" server/src/services/separator.js
