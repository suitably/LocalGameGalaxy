/**
 * TTS import report and script sidecar types [ID: LOGIC-TABLETOP-IMPORT-TYPES]
 */

/** What happened to one TTS object type during import (counts of top-level objects). */
export interface ImportTypeCount {
  converted: number;
  degraded: number;
  dropped: number;
}

/** Honest summary of a Tabletop Simulator import: what was converted, degraded or dropped. */
export interface ImportReport {
  source: 'tts';
  totals: ImportTypeCount & { objects: number };
  byType: Record<string, ImportTypeCount>;
  scripts: { global: boolean; objects: number; xmlUi: boolean };
  /** Image URLs per host (after URL rewriting). */
  imageHosts: Record<string, number>;
  /** Result of caching the images on this device at import (#693); absent before it ran. */
  assets?: AssetCacheSummary;
  /** Setup buttons found in the Lua scripts and how many got a routine (#704). */
  buttons?: { total: number; translated: number };
  /** Script functions the Lua translator left out, with the reason (#704). */
  untranslated?: UntranslatedScriptFunction[];
}

/**
 * One script function the static Lua translator did not translate. `owner` is `global` or the
 * TTS GUID of the object script; `fn` is `*` for a whole script. `reason` is the first call or
 * statement it could not map (`Wait.time`, `if`, …) or one of `event`, `dynamic`, `missing`,
 * `click_function`, `no_owner`, `too_many_steps`, `invalid_routine`, `parse_error`.
 */
export interface UntranslatedScriptFunction {
  owner: string;
  fn: string;
  reason: string;
}

/** Summary of one per-device image cache run (`logic/assetCache.ts`). */
export interface AssetCacheSummary {
  total: number;
  cached: number;
  failed: number;
  /** Failed URLs per host (dead or CORS-blocked without proxy). */
  deadHosts: Record<string, number>;
}

/** Script layer of one TTS object (or the save itself), kept verbatim and never executed. */
export interface ScriptEntry {
  lua?: string;
  luaState?: string;
  xmlUi?: string;
  tags?: string[];
  gmNotes?: string;
  /** TTS `Description`; only the Lua runtime reads and writes it (#705). */
  description?: string;
}

/** Script sidecar of an imported game: Global plus per-object entries keyed by TTS GUID. */
export interface GameScripts {
  global?: ScriptEntry;
  objects: Record<string, ScriptEntry>;
  /** World bounds the importer projected with, for script positions (`luaProjection.ts`, #705). */
  projection?: { minX: number; maxZ: number; scale: number; margin: number };
  /** TTS player colour of each seat index (`assignSeats`), for `Player[color]` (#705). */
  seatColors?: string[];
  /** TTS `Notes` panel text the Lua runtime keeps (#705). */
  notes?: string;
}

/** A game file that names a built-in rule script (`scripted/`, e.g. `maumau`); never code. */
export interface RuleScriptRef {
  ruleScript?: string;
}
