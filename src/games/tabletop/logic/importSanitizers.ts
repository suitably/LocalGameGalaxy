/**
 * Sanitizers for the import report and script sidecar [ID: LOGIC-TABLETOP-IMPORT-SANITIZERS]
 */
import type {
  AssetCacheSummary,
  ImportReport,
  GameScripts,
  ScriptEntry,
  UntranslatedScriptFunction,
} from './importTypes';

/** Report entries kept when loading (same cap as the translator's). */
const MAX_UNTRANSLATED = 200;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === 'object' && !Array.isArray(v);

const optString = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : undefined);

function sanitizeScriptEntry(raw: unknown): ScriptEntry | undefined {
  if (!isRecord(raw)) return undefined;
  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter((t): t is string => typeof t === 'string')
    : [];
  const entry: ScriptEntry = {
    lua: optString(raw.lua),
    luaState: optString(raw.luaState),
    xmlUi: optString(raw.xmlUi),
    tags: tags.length > 0 ? tags : undefined,
    gmNotes: optString(raw.gmNotes),
  };
  return Object.values(entry).some((v) => v !== undefined) ? entry : undefined;
}

/** Keeps the script sidecar verbatim; drops malformed entries. */
export function sanitizeScripts(raw: unknown): GameScripts | undefined {
  if (!isRecord(raw)) return undefined;
  const global = sanitizeScriptEntry(raw.global);
  const objects: Record<string, ScriptEntry> = {};
  for (const [guid, e] of Object.entries(isRecord(raw.objects) ? raw.objects : {})) {
    const entry = sanitizeScriptEntry(e);
    if (entry) objects[guid] = entry;
  }
  if (!global && Object.keys(objects).length === 0) return undefined;
  return { ...(global ? { global } : {}), objects };
}

const countOf = (v: unknown) => (typeof v === 'number' && v >= 0 ? Math.floor(v) : 0);

function sanitizeCounts(raw: unknown) {
  const r = isRecord(raw) ? raw : {};
  return {
    converted: countOf(r.converted),
    degraded: countOf(r.degraded),
    dropped: countOf(r.dropped),
  };
}

function sanitizeAssetSummary(raw: unknown): AssetCacheSummary | undefined {
  if (!isRecord(raw)) return undefined;
  const deadHosts: Record<string, number> = {};
  for (const [host, n] of Object.entries(isRecord(raw.deadHosts) ? raw.deadHosts : {})) {
    deadHosts[host] = countOf(n);
  }
  return {
    total: countOf(raw.total),
    cached: countOf(raw.cached),
    failed: countOf(raw.failed),
    deadHosts,
  };
}

function sanitizeUntranslated(raw: unknown): UntranslatedScriptFunction[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const text = (v: unknown) => (typeof v === 'string' ? v.slice(0, 120) : '');
  return raw
    .filter(isRecord)
    .map((e) => ({ owner: text(e.owner), fn: text(e.fn), reason: text(e.reason) }))
    .filter((e) => e.owner && e.fn)
    .slice(0, MAX_UNTRANSLATED);
}

export function sanitizeImportReport(raw: unknown): ImportReport | undefined {
  if (!isRecord(raw) || raw.source !== 'tts') return undefined;
  const byType: ImportReport['byType'] = {};
  for (const [type, c] of Object.entries(isRecord(raw.byType) ? raw.byType : {})) {
    byType[type] = sanitizeCounts(c);
  }
  const imageHosts: Record<string, number> = {};
  for (const [host, n] of Object.entries(isRecord(raw.imageHosts) ? raw.imageHosts : {})) {
    imageHosts[host] = countOf(n);
  }
  const scripts = isRecord(raw.scripts) ? raw.scripts : {};
  return {
    source: 'tts',
    totals: {
      ...sanitizeCounts(raw.totals),
      objects: countOf(isRecord(raw.totals) && raw.totals.objects),
    },
    byType,
    scripts: {
      global: Boolean(scripts.global),
      objects: countOf(scripts.objects),
      xmlUi: Boolean(scripts.xmlUi),
    },
    imageHosts,
    ...(isRecord(raw.assets) ? { assets: sanitizeAssetSummary(raw.assets) } : {}),
    ...(isRecord(raw.buttons)
      ? {
          buttons: {
            total: countOf(raw.buttons.total),
            translated: countOf(raw.buttons.translated),
          },
        }
      : {}),
    ...(Array.isArray(raw.untranslated)
      ? { untranslated: sanitizeUntranslated(raw.untranslated) }
      : {}),
  };
}
