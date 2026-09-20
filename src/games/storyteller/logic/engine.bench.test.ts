import { describe, it, vi } from "vitest";
import { LocalStoryEngine } from "./engine";
import * as db from "./db";
import * as repository from "./repository";
import type { StoryGameRecord, StoryGameSnapshot, StoryPlayer } from "../types";
import { DEFAULT_MODIFIER_SETTINGS } from "./modifiers";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof db>();
  return {
    ...actual,
    getByKey: vi.fn(),
    getAll: vi.fn(),
    putItem: vi.fn(),
    deleteByKey: vi.fn(),
  };
});

vi.mock("./repository", async (importOriginal) => {
  const actual = await importOriginal<typeof repository>();
  return {
    ...actual,
    fetchEntriesForGame: vi.fn().mockResolvedValue([]),
    getStoryGame: vi.fn(),
    updateStoryGame: vi.fn().mockImplementation(async (id, updater) => {
      return typeof updater === "function" ? updater({ id } as any) : updater;
    }),
  };
});

describe("LocalStoryEngine.importSnapshot benchmark", () => {
  function generatePlayers(count: number): StoryPlayer[] {
    const players: StoryPlayer[] = [];
    for (let i = 0; i < count; i++) {
      players.push({
        id: "player_" + i,
        name: "Player " + i,
        isRemote: false,
        ntfyTopic: "topic_" + i,
        relayUrl: "https://relay.example.com/" + i,
        notificationMethod: "ntfy",
      });
    }
    return players;
  }

  it("benchmark importSnapshot with 1000 players", async () => {
    const playersCount = 1000;
    const existingPlayers = generatePlayers(playersCount);
    const incomingPlayers = generatePlayers(playersCount).map((p, idx) => {
      if (idx === playersCount - 1) {
        return { ...p, ntfyTopic: "topic_updated" };
      }
      return { ...p };
    });

    const existingGame: StoryGameRecord = {
      id: "game_bench",
      type: "local",
      status: "writing",
      turnNumber: 10,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      players: existingPlayers,
      currentPlayerIndex: 0,
      options: { language: "de", modifiers: DEFAULT_MODIFIER_SETTINGS },
    };

    const snapshot: StoryGameSnapshot = {
      game: {
        ...existingGame,
        updatedAt: "2026-01-01T00:00:00.000Z",
        players: incomingPlayers,
      },
      entries: [],
    };

    vi.mocked(repository.getStoryGame).mockResolvedValue(existingGame);

    const iterations = 50;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await LocalStoryEngine.importSnapshot(snapshot);
    }
    const duration = performance.now() - start;
    console.log("[BENCHMARK] " + iterations + " runs with " + playersCount + " players took " + duration.toFixed(2) + "ms (avg " + (duration / iterations).toFixed(4) + "ms/run)");
  });
});
