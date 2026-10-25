/**
 * Unique names for saved table states (#538) [ID: GAME-TABLETOP-SAVE-NAMES]
 *
 * Names compare trimmed and case-insensitive within one game. The companion server applies
 * the same rule (`server/src/plugins/tabletop/services/saveStore.ts`) and answers 409.
 */

export interface NamedEntry {
  id: string;
  name: string;
  /** False for another user's server save: it can be loaded, never overwritten. */
  mine: boolean;
}

export type SaveNameCheck =
  | { kind: 'empty' }
  | { kind: 'free' }
  /** One of the caller's own saves already has this name: overwriting it is allowed. */
  | { kind: 'own'; id: string; suggestion: string }
  | { kind: 'taken'; suggestion: string };

export const normalizeSaveName = (name: string): string => name.trim().toLocaleLowerCase();

/** The name itself if free, else the first free "name (n)" (an existing " (n)" is replaced). */
export function suggestUniqueName(name: string, taken: Iterable<string>): string {
  const used = new Set(Array.from(taken, normalizeSaveName));
  const trimmed = name.trim();
  if (!used.has(normalizeSaveName(trimmed))) return trimmed;
  const base = trimmed.replace(/\s+\(\d+\)$/, '');
  for (let i = 2; ; i++) {
    const candidate = `${base} (${i})`;
    if (!used.has(normalizeSaveName(candidate))) return candidate;
  }
}

export function checkSaveName(name: string, entries: readonly NamedEntry[]): SaveNameCheck {
  if (!name.trim()) return { kind: 'empty' };
  const wanted = normalizeSaveName(name);
  const match = entries.find((e) => normalizeSaveName(e.name) === wanted);
  if (!match) return { kind: 'free' };
  const suggestion = suggestUniqueName(
    name,
    entries.map((e) => e.name),
  );
  return match.mine ? { kind: 'own', id: match.id, suggestion } : { kind: 'taken', suggestion };
}
