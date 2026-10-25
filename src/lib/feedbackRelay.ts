/**
 * Feedback relay: lets a connected remote (e.g. a Melodiq phone) route feedback through its host,
 * which submits it with its own GitHub PAT. `submitFeedback` (lib/github.ts) tries the relay first.
 */

export interface FeedbackResult {
  success: boolean;
  issueUrl?: string;
  error?: string;
  /** `no_token`: the submitting side has no GitHub PAT, so the caller may fall back to its own. */
  code?: 'no_token';
}

export type FeedbackRelay = (title: string, body: string) => Promise<FeedbackResult>;

let activeRelay: FeedbackRelay | null = null;

/** Registers the relay and returns a function that removes it again. */
export function registerFeedbackRelay(relay: FeedbackRelay): () => void {
  activeRelay = relay;
  return () => {
    if (activeRelay === relay) activeRelay = null;
  };
}

export function getFeedbackRelay(): FeedbackRelay | null {
  return activeRelay;
}

export function hasFeedbackRelay(): boolean {
  return activeRelay !== null;
}
