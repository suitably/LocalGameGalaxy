/**
 * Loading a game for a short join link [ID: GUESSART-JOIN-FROM-MAILBOX]
 *
 * A short link (QR code) carries no game data: the game arrives as the retained mailbox
 * snapshot the inviting device published.
 */
import type { GameSnapshot } from './types';

/** How long a short link waits for the game's mailbox snapshot. */
export const MAILBOX_WAIT_MS = 15000;

export interface JoinMailboxDeps {
  subscribe: (
    gameId: string,
    listener: (snapshot: GameSnapshot) => Promise<void> | void,
  ) => () => void;
  importSnapshot: (snapshot: GameSnapshot) => Promise<unknown>;
}

/** Waits for the game's snapshot from the mailbox and imports it; false on timeout. */
export function importFromMailbox(
  gameId: string,
  { subscribe, importSnapshot }: JoinMailboxDeps,
  timeoutMs = MAILBOX_WAIT_MS,
): Promise<boolean> {
  return new Promise((resolve) => {
    let unsubscribe = () => {};
    const finish = (ok: boolean) => {
      clearTimeout(timer);
      unsubscribe();
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    unsubscribe = subscribe(gameId, async (snapshot) => {
      if (snapshot?.game?.id !== gameId) return;
      await importSnapshot(snapshot);
      finish(true);
    });
  });
}
