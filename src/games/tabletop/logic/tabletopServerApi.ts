/**
 * Tabletop games on the companion server: load, save, delete [ID: GAME-TABLETOP-SERVER-API]
 */
import { companionRequest, jsonBody } from '../../../lib/companion/companionHttp';
import { getHelperUrl } from '../../../lib/companion/companionSettings';
import { validateAndSanitizeGame } from './gameValidator';
import { parsePcioFile } from './pcioParser';
import { prepareGameForServer } from './serverGameSnapshot';
import type { TabletopGameDefinition } from './types';

export interface ServerGameEntry {
  id: string;
  name: string;
  author?: string;
  description?: string;
  widgetCount: number;
  cardCount: number;
  format?: 'flat-json' | 'pcio-folder' | 'tts-workshop' | 'unknown';
  updatedAt: number;
  /** Saved from the app, so it can be overwritten and deleted (older servers omit it). */
  saved?: boolean;
}

interface TabletopRawResponse {
  id: string;
  rawJson: string;
  assetMap: Record<string, string>;
}

/** A game this app saved (our own format) loads as is; anything else goes through the importer. */
export function isNativeGameDefinition(value: unknown): value is TabletopGameDefinition {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.supportedModes) &&
    !!v.widgets &&
    typeof v.widgets === 'object' &&
    !!v.table &&
    typeof v.table === 'object'
  );
}

export async function parseServerGame(
  serverId: string,
  rawJson: string,
  assetMap: Record<string, string>,
): Promise<TabletopGameDefinition> {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    // the importer reports broken files itself
  }
  if (isNativeGameDefinition(parsed)) {
    // keyed by the server id, so playing and saving again address the same game
    return validateAndSanitizeGame({ ...parsed, id: serverId });
  }
  return parsePcioFile(rawJson, { assetFiles: assetMap });
}

export async function loadServerGame(id: string): Promise<TabletopGameDefinition> {
  const data = await companionRequest<TabletopRawResponse>(
    `/api/tabletop/games/${encodeURIComponent(id)}/raw`,
  );
  return parseServerGame(id, data.rawJson, data.assetMap);
}

/** Saves a new game (no id) or overwrites a saved one; returns the server's entry. */
export async function saveGameOnServer(
  game: TabletopGameDefinition,
  serverId?: string,
): Promise<ServerGameEntry> {
  // the stored id is ignored on load: the server's id replaces it (see parseServerGame)
  const prepared = await prepareGameForServer(game, getHelperUrl());
  return companionRequest<ServerGameEntry>(
    serverId ? `/api/tabletop/games/${encodeURIComponent(serverId)}` : '/api/tabletop/games',
    jsonBody(serverId ? 'PUT' : 'POST', { game: prepared }),
  );
}

export const deleteGameOnServer = (serverId: string) =>
  companionRequest<{ success: true }>(`/api/tabletop/games/${encodeURIComponent(serverId)}`, {
    method: 'DELETE',
  });
