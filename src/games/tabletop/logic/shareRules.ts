/**
 * Which games may leave the device as a file [ID: GAME-TABLETOP-SHARE-RULES]
 *
 * Own games are shared by exporting a file (`tabletopExporter.ts`) or by saving them to the
 * companion server's library (`tabletopServerApi.ts`). Imported third-party content never
 * leaves the device as a file (TTS plan D4, ADR-0005 §5); a companion copy of it is marked
 * `companionPrivate` instead (`serverGameSnapshot.ts`).
 */
import type { TabletopGameDefinition, TabletopGameSummary } from './types';

/**
 * Imported third-party content (TTS Workshop; `importReport` covers imports made before
 * `format` existed; `companionPrivate` marks a companion copy of such a game).
 */
export const isThirdPartyImport = (game: TabletopGameDefinition): boolean =>
  game.format === 'tts-workshop' || game.importReport?.source === 'tts' || !!game.companionPrivate;

/** The same rule for a listed game, before its full definition is loaded. */
export const isThirdPartySummary = (game: Pick<TabletopGameSummary, 'format'>): boolean =>
  game.format === 'tts-workshop';

/** Thrown when a third-party import would be written to a share file. */
export class ShareBlockedError extends Error {
  readonly reason = 'third_party_import' as const;
  constructor() {
    super('Imported third-party games cannot be shared as a file');
    this.name = 'ShareBlockedError';
  }
}

export function assertShareable(game: TabletopGameDefinition): void {
  if (isThirdPartyImport(game)) throw new ShareBlockedError();
}
