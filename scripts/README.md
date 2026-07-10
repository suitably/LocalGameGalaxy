# Utility & Development Scripts [ID: SCRIPTS-INDEX]

This directory contains utility scripts, development aids, and background processes for the LocalGameGalaxy project.

---

## 1. Process Runners

### `start-tracker.js`
Starts a local BitTorrent-based WebRTC signaling tracker on port 8000. Used for offline/local-network peer-to-peer discovery between mobile clients and the TV host.
- **Execution**:
  ```bash
  node scripts/start-tracker.js
  ```

---

## 2. Ingestion & Alignment Utilities

### `fix_align.py` & `fix_align_logic.py`
Process vocal alignment data to calibrate lyrics timing with separated audio stems.
- **Prerequisites**: Python 3.10+, Virtual Environment activated.
- **Execution**:
  ```bash
  python scripts/fix_align.py
  ```

### `remove_blur.py`
Helper script for preprocessing background images and styling assets.
- **Execution**:
  ```bash
  python scripts/remove_blur.py
  ```

---

## 3. Localization Utilities

### `update_i18n.py` & `update_i18n_helper.py`
Synchronizes translation namespaces between the English (`en`) and German (`de`) locales, ensuring keys are present in both translation files.
- **Execution**:
  ```bash
  python scripts/update_i18n.py
  ```

---

## 4. Refactoring & Code Patching Scripts

### `patch_game_settings.py`, `patch_melodiq.py`, & `replace_melodiq.py`
Automation scripts used during refactoring to update game interfaces, schema configurations, or replace Melodiq state hook bindings.

### `fix_imports.py` & `fix_ts.py`
Clean-up scripts that automatically adjust import path scopes and patch common TypeScript type checks after refactoring.
