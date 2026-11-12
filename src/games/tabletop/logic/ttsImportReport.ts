/**
 * TTS import report and script sidecar [ID: LOGIC-TABLETOP-TTS-IMPORT-REPORT]
 *
 * Pure functions (#686): per TTS type converted / degraded / dropped, scripts present, image
 * hosts, and the verbatim script layer (ADR-0005 decision 2). The classifier is the single
 * source for the importer UI and the `scripts/tts-compat` harness. Script content is runtime-only
 * and never leaves the device (Q21, ADR-0005 decision 5).
 */
import type { GameScripts, ImportReport, ImportTypeCount, ScriptEntry } from './importTypes';
import type { TTSObjectState, TTSSaveFile } from './ttsTypes';

export type ImportOutcome = 'converted' | 'degraded' | 'dropped';

/**
 * Object names `parseTtsSaveFile` skips on purpose (Notecards keep their text as rules).
 * `Custom_Model` is not among them: it becomes a sprite or labelled token (#693, D7) → degraded.
 */
const isDropped = (name: string) =>
  name === 'Custom_Assetbundle' ||
  name === 'Custom_PDF' ||
  name.startsWith('Notecard') ||
  name.startsWith('Tablet');

const CONVERTED_NAMES = new Set([
  'Deck',
  'DeckCustom',
  'Card',
  'Bag',
  'Infinite_Bag',
  'HandTrigger',
  'FogOfWarTrigger',
  'Custom_Tile',
  'Custom_Board',
  'Figurine_Custom',
  'Custom_Token',
  '3DText',
  'ScriptingTrigger',
]);

/** Outcome of the importer for a TTS object name; anything unknown becomes a generic token. */
export function classifyTtsObject(name: string): ImportOutcome {
  if (isDropped(name)) return 'dropped';
  if (
    CONVERTED_NAMES.has(name) ||
    /^Die_\d+$/i.test(name) ||
    name.startsWith('backgammon_piece') ||
    name.startsWith('PiecePack_')
  ) {
    return 'converted';
  }
  return 'degraded';
}

/** Depth-first walk over objects, their bag/deck contents and their alternative states. */
export function* walkTtsObjects(objects: TTSObjectState[] | undefined): Generator<TTSObjectState> {
  for (const obj of objects ?? []) {
    yield obj;
    yield* walkTtsObjects(obj.ContainedObjects);
    if (obj.States) yield* walkTtsObjects(Object.values(obj.States));
  }
}

/** Image URLs of one object (deck sheets, board/tile image, mesh diffuse). */
export function ttsImageUrls(obj: TTSObjectState): string[] {
  const urls: (string | undefined)[] = [];
  for (const d of Object.values(obj.CustomDeck ?? {})) urls.push(d.FaceURL, d.BackURL);
  if (obj.CustomImage) urls.push(obj.CustomImage.ImageURL, obj.CustomImage.ImageSecondaryURL);
  if (obj.CustomMesh) urls.push(obj.CustomMesh.DiffuseURL);
  return urls.filter((u): u is string => typeof u === 'string' && u.length > 0);
}

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname || 'invalid';
  } catch {
    return 'invalid';
  }
};

/** Builds the report from the raw save; `sanitizeUrl` is the importer's URL rewriting. */
export function buildImportReport(
  save: TTSSaveFile,
  sanitizeUrl: (url: string) => string = (u) => u,
): ImportReport {
  const byType: Record<string, ImportTypeCount> = {};
  const totals = { objects: 0, converted: 0, degraded: 0, dropped: 0 };
  for (const obj of save.ObjectStates) {
    const outcome = classifyTtsObject(obj.Name);
    totals.objects += 1;
    totals[outcome] += 1;
    (byType[obj.Name] ??= { converted: 0, degraded: 0, dropped: 0 })[outcome] += 1;
  }

  const imageHosts: Record<string, number> = {};
  const scripts = { global: Boolean(save.LuaScript), objects: 0, xmlUi: Boolean(save.XmlUI) };
  for (const obj of walkTtsObjects(save.ObjectStates)) {
    if (obj.LuaScript) scripts.objects += 1;
    if (obj.XmlUI) scripts.xmlUi = true;
    for (const url of ttsImageUrls(obj)) {
      const host = hostOf(sanitizeUrl(url));
      imageHosts[host] = (imageHosts[host] ?? 0) + 1;
    }
  }
  return { source: 'tts', totals, byType, scripts, imageHosts };
}

function entryOf(src: {
  LuaScript?: string;
  LuaScriptState?: string;
  XmlUI?: string;
  Tags?: string[];
  GMNotes?: string;
}): ScriptEntry | undefined {
  const entry: ScriptEntry = {};
  if (src.LuaScript) entry.lua = src.LuaScript;
  if (src.LuaScriptState) entry.luaState = src.LuaScriptState;
  if (src.XmlUI) entry.xmlUi = src.XmlUI;
  if (src.Tags?.length) entry.tags = [...src.Tags];
  if (src.GMNotes?.trim()) entry.gmNotes = src.GMNotes;
  return Object.keys(entry).length > 0 ? entry : undefined;
}

/**
 * Script layer of the save: Global plus every object (also inside bags/decks/states) that has
 * Lua, saved Lua state, XML UI, tags or GM notes, keyed by GUID (`guid~2` on repeats). Verbatim,
 * never executed. `undefined` when the save has none.
 */
export function extractScripts(save: TTSSaveFile): GameScripts | undefined {
  const global = entryOf({ ...save, GMNotes: undefined });
  const objects: Record<string, ScriptEntry> = {};
  for (const obj of walkTtsObjects(save.ObjectStates)) {
    const entry = entryOf(obj);
    if (!entry) continue;
    let key = obj.GUID;
    for (let n = 2; key in objects; n++) key = `${obj.GUID}~${n}`;
    objects[key] = entry;
  }
  if (!global && Object.keys(objects).length === 0) return undefined;
  return { ...(global ? { global } : {}), objects };
}
