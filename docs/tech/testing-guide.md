# Testing Guide [ID: TECH-TESTING]

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

## 3. Directory Structure and Naming Conventions

All test files must follow these conventions:
- **Client Tests**: Placed alongside the implementation files with a `.test.ts` or `.test.tsx` extension.
  - *Example*: `src/games/werewolf/logic/gameReducer.test.ts`
- **Server Tests**: Placed in the same directory as their target files or in a nested `tests` folder, ending with `.test.js`.
  - *Example*: `server/src/utils/parser.test.js`

---

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
  default: MockPeer
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
- **Manual Verification**: Since WebRTC relies on local network devices, manual testing using multiple browsers/phones remains a critical verification step. See [Verification Guide](file:///home/deck/Projects/LocalGameGalaxy/docs/verification/00_SUMMARY.md) for walkthroughs.
