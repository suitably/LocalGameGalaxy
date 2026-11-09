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
}

/** Script layer of one TTS object (or the save itself), kept verbatim and never executed. */
export interface ScriptEntry {
  lua?: string;
  luaState?: string;
  xmlUi?: string;
  tags?: string[];
  gmNotes?: string;
}

/** Script sidecar of an imported game: Global plus per-object entries keyed by TTS GUID. */
export interface GameScripts {
  global?: ScriptEntry;
  objects: Record<string, ScriptEntry>;
}
