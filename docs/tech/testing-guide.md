---
type: Howto
title: 'Testing guide'
description: 'Test runners (Vitest for src/, node --test for server/ and scripts/), where test files live, the node (non-DOM) test environment, mocking patterns, and what CI runs.'
tags: [testing, vitest, node-test, ci]
status: stable
generated:
  at: 2026-10-18T15:00:00+02:00
  by: claude-code
verified:
  at: 2026-10-18
  method: 'vite.config.ts test block, package.json scripts, find of *.test.* files; tests not executed in this audit'
sources:
  - 'vite.config.ts'
  - 'package.json'
  - 'server/package.json'
  - 'merged from: previous version of 2026-09-27'
---

# Testing Guide

This document outlines the testing strategy, frameworks, execution commands, and patterns for writing and maintaining tests in LocalGameGalaxy.

---

## 1. Testing Frameworks

The repository uses separate testing frameworks tailored for the frontend and the companion backend:

1. **Frontend (React Client)**: Powered by **Vitest**, a fast unit test runner integrated with Vite.
2. **Backend (Companion Server)**: Uses the **built-in Node.js Test Runner** (`node --test`), which provides native, zero-dependency testing capabilities.

---

## 2. Running Tests

### Running Frontend Tests

To run client-side tests once:

```bash
npm run test
```

To run client-side tests in watch mode (interactive development):

```bash
npx vitest
```

### Running Backend Tests

To run companion server tests:

```bash
cd server
npm run test
```

---

## 3. Where tests live

| Suite            | Pattern                                                                                                                                                                                     | Runner                                               | Command                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------- |
| Frontend         | `src/**/*.{test,spec}.{ts,tsx}` (62 files), co-located, e.g. `src/games/werewolf/logic/utils.test.ts`, `src/modules/sync/MqttMailboxService.test.ts`, `src/games/tabletop/logic/__tests__/` | Vitest (config in `vite.config.ts` → `test.include`) | `npm test`                               |
| Server           | `server/test/*.test.js` (`config_and_cors`, `media_and_streaming`, `tabletop_plugin`) — run against the **built** `dist/`                                                                   | `node --test`                                        | `cd server && npm run build && npm test` |
| Pipeline scripts | `scripts/pipeline/*.test.cjs`, `scripts/lib/*.test.mjs`                                                                                                                                     | `node --test`                                        | `npm run test:scripts`                   |

Vitest runs in the default **node** environment — there is no jsdom/happy-dom dependency. Test pure logic and hooks' helper functions; component tests import plain functions from component files (e.g. `PartyLobby.test.tsx` tests `getOrCreatePlayerName`). Adding DOM tests means adding an environment package first.

The hygiene check rejects committed `.only(` tests.

## 4. Mocking External and Browser APIs

Since LocalGameGalaxy relies on hardware-level APIs (WebRTC, Web Audio, IndexedDB), tests must mock these interfaces to run successfully in headless/CI environments.

### A. Mocking Dexie / IndexedDB

For Dexie/IndexedDB, use a mock in-memory database or stub Dexie hooks.

```typescript
import { vi } from 'vitest';

// Mocking Dexie Database
vi.mock('../db', () => ({
  db: {
    songs: {
      toArray: vi.fn().mockResolvedValue([]),
      add: vi.fn(),
    },
  },
}));
```

### B. Mocking WebRTC (`SimplePeer`)

Mock connection states and data channels:

```typescript
class MockPeer {
  on = vi.fn();
  send = vi.fn();
  destroy = vi.fn();
}

vi.mock('simple-peer', () => ({
  default: MockPeer,
}));
```

### C. Mocking Web Audio API

```typescript
beforeAll(() => {
  global.AudioContext = vi.fn().mockImplementation(() => ({
    createOscillator: vi.fn().mockReturnValue({
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }),
    destination: {},
  }));
});
```

---

## 5. Test Categorization

- **Unit Tests**: Focus on pure functions (e.g., UltraStar lyrics parser, Werewolf game state reducers, scoring algorithms).
- **Integration Tests**: Focus on component rendering, state changes across multiple views, and synchronization messages.
- **Manual Verification**: Since WebRTC relies on local network devices, manual testing using multiple browsers/phones remains a critical verification step. Describe the manual test steps and their results in the PR description.
