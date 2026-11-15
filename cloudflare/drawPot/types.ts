/**
 * Draw pot (Lostopf) data model, shared by the worker and the app [ID: CF-DRAWPOT-TYPES]
 *
 * One pot lives in one Durable Object (`DrawPotObject`). The app imports these types only
 * (`import type`), never runtime code.
 */

/** `pot`: draw items from a pot. `secret-santa`: every name draws another name, never itself. */
export type DrawPotMode = 'pot' | 'secret-santa';

export interface DrawPotSettings {
  mode: DrawPotMode;
  /** Pot mode: drawn items leave the pot (no duplicates) instead of going back in. */
  removeDrawn: boolean;
  /** Pot mode: draws per participant (device); `null` = unlimited. Secret santa is always 1. */
  maxDrawsPerParticipant: number | null;
  /** The host's admin view shows who drew what. Off keeps results secret from the host too. */
  hostSeesResults: boolean;
  /** Participants see the list of entries (pot mode: what is still in the pot). */
  showEntries: boolean;
}

export interface DrawPotEntry {
  id: string;
  label: string;
}

export interface DrawRecord {
  entryId: string;
  label: string;
  participantId: string;
  /** Secret santa: the entry id of the name the participant claimed as their own. */
  identityId?: string;
  at: number;
}

export interface DrawPotState {
  version: 1;
  id: string;
  title: string;
  description: string;
  createdAt: number;
  expiresAt: number;
  closed: boolean;
  settings: DrawPotSettings;
  entries: DrawPotEntry[];
  /** Pot mode with `removeDrawn`: entry ids still in the pot. */
  remaining: string[];
  /** Secret santa: giver entry id → receiver entry id, fixed at creation (one derangement). */
  assignments: Record<string, string>;
  draws: DrawRecord[];
  adminKeyHash: string;
}

export interface CreateDrawPotInput {
  title: string;
  description?: string;
  entries: string[];
  settings: DrawPotSettings;
}

export interface CreateDrawPotResponse {
  id: string;
  adminKey: string;
  expiresAt: number;
}

/** What a participant may see. */
export interface DrawPotPublicView {
  id: string;
  title: string;
  description: string;
  closed: boolean;
  expiresAt: number;
  settings: DrawPotSettings;
  totalEntries: number;
  /** Items left in the pot (pot mode with `removeDrawn`), otherwise `totalEntries`. */
  remainingCount: number;
  /** Entries (`showEntries`, pot mode) or the names to pick from (secret santa). */
  entries: (DrawPotEntry & { taken: boolean })[] | null;
  /** This participant's draws, when the request named a participant id. */
  myDraws: DrawRecord[];
  drawsLeft: number | null;
}

export interface DrawPotAdminView extends DrawPotPublicView {
  createdAt: number;
  /** Always present for the host. */
  entries: (DrawPotEntry & { taken: boolean })[];
  drawCount: number;
  participantCount: number;
  /** Full draw log when `hostSeesResults`, otherwise draws without the drawn label. */
  draws: (Omit<DrawRecord, 'label' | 'entryId'> & {
    label: string | null;
    entryId: string | null;
  })[];
}

export type DrawPotAdminAction = 'reset' | 'close' | 'reopen';

export type DrawPotErrorCode =
  | 'invalid'
  | 'not_found'
  | 'closed'
  | 'empty'
  | 'limit_reached'
  | 'identity_taken'
  | 'identity_required'
  | 'forbidden'
  | 'unavailable';

export interface DrawPotError {
  error: DrawPotErrorCode;
  message?: string;
  /** `limit_reached`: the participant's existing draws, so a device can show them again. */
  myDraws?: DrawRecord[];
}

export interface DrawResponse {
  draw: DrawRecord;
  pot: DrawPotPublicView;
}
