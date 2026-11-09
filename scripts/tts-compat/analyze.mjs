/**
 * Pure analysis of one Tabletop Simulator save: object conversion, decks, seats, image hosts,
 * scripts and the tier it reaches. The parser is injected so the module is testable offline.
 */
import { analyzeLua } from './lua.mjs';

/** Slice 8 translator (planned): Lua calls that become routine ops. getObjectFromGUID addresses the targets. */
export const PLANNED_TRANSLATABLE = new Set([
  'createButton',
  'shuffle',
  'deal',
  'dealToColor',
  'takeObject',
  'putObject',
  'flip',
  'setState',
  'setName',
  'broadcastToAll',
  'getObjectFromGUID',
]);

/** Slice 9 shim v1 (planned) — a superset of the translator set. */
export const PLANNED_SHIM = new Set([
  ...PLANNED_TRANSLATABLE,
  'getAllObjects',
  'getObjectsWithTag',
  'getPosition',
  'setPosition',
  'getRotation',
  'setRotation',
  'getObjects',
  'getQuantity',
  'getName',
  'getDescription',
  'setDescription',
  'getGMNotes',
  'setGMNotes',
  'getVar',
  'setVar',
  'call',
  'editButton',
  'clearButtons',
  'printToAll',
  'printToColor',
  'Wait.time',
  'Wait.frames',
  'Wait.condition',
  'getSeatedPlayers',
  'JSON.encode',
  'JSON.decode',
  'getGUID',
]);

/** Implemented today: nothing translates or runs Lua yet. Bump when slices 8/9 land. */
export const IMPLEMENTED = { translatable: new Set(), shim: new Set() };

/** Calls that put a mod out of scope (tier D). */
const OUT_OF_SCOPE_CALLS = new Set([
  'WebRequest.get',
  'WebRequest.post',
  'WebRequest.put',
  'WebRequest.custom',
]);
const SPAWN_PHYSICS = new Set(['addForce', 'setVelocity', 'setAngularVelocity']);

function* walkObjects(objects, depth = 0) {
  for (const obj of objects ?? []) {
    yield [obj, depth];
    yield* walkObjects(obj.ContainedObjects, depth + 1);
    if (obj.States) yield* walkObjects(Object.values(obj.States), depth + 1);
  }
}

function collectUrls(obj) {
  const urls = [];
  for (const d of Object.values(obj.CustomDeck ?? {})) urls.push(d.FaceURL, d.BackURL);
  if (obj.CustomImage) urls.push(obj.CustomImage.ImageURL, obj.CustomImage.ImageSecondaryURL);
  if (obj.CustomMesh) urls.push(obj.CustomMesh.DiffuseURL);
  return urls.filter((u) => typeof u === 'string' && u.length > 0);
}

export function urlHost(url) {
  try {
    const u = new URL(url);
    return { scheme: u.protocol.replace(':', ''), host: u.hostname };
  } catch {
    return { scheme: 'invalid', host: 'invalid' };
  }
}

function luaSources(save) {
  const out = [];
  if (save.LuaScript) out.push({ where: 'global', src: save.LuaScript });
  for (const [obj] of walkObjects(save.ObjectStates)) {
    if (obj.LuaScript) out.push({ where: 'object', src: obj.LuaScript });
  }
  return out;
}

/**
 * @param {object} save TTS save (parsed JSON)
 * @param {{ parse: (save: object) => any, classify: (name: string) => 'converted' | 'degraded' | 'dropped', sanitizeUrl?: (u: string) => string }} deps
 *   `classify` is the importer's own `classifyTtsObject` (ttsImportReport.ts), not a copy.
 */
export function analyzeSave(save, { parse, classify, sanitizeUrl = (u) => u }) {
  const top = save.ObjectStates ?? [];
  const objects = { total: top.length, converted: 0, degraded: 0, dropped: 0, byType: {} };
  for (const obj of top) {
    const kind = classify(obj.Name);
    objects[kind] += 1;
    const t = (objects.byType[obj.Name] ??= { converted: 0, degraded: 0, dropped: 0 });
    t[kind] += 1;
  }
  const guids = new Map();
  for (const obj of top) guids.set(obj.GUID, (guids.get(obj.GUID) ?? 0) + 1);
  const guidCollisions = [...guids.values()].filter((n) => n > 1).reduce((s, n) => s + n - 1, 0);

  let game;
  let parseError;
  try {
    game = parse(save);
  } catch (err) {
    parseError = String(err?.message ?? err).slice(0, 200);
  }

  const widgets = game ? Object.values(game.widgets ?? {}) : [];
  const widgetDecks = widgets.filter((w) => w.type === 'deck');
  const sourceDecks = top.filter((o) => o.Name === 'Deck' || o.Name === 'DeckCustom');
  const decks = sourceDecks.map((obj, i) => {
    const expected = obj.DeckIDs?.length ?? obj.ContainedObjects?.length ?? 0;
    const actual = widgetDecks[i]?.cardIds?.length ?? 0;
    return { guid: obj.GUID, expected, actual };
  });
  const decksComplete = !parseError && decks.every((d) => d.actual === d.expected);

  const seats = widgets.filter((w) => w.type === 'holder' && w.isHand).map((w) => w.ownerSeat);
  const maxPlayers = game?.maxPlayers ?? save.PlayerCounts?.[1] ?? 6;
  const seatsOk =
    !parseError && seats.every((s) => Number.isInteger(s) && s >= 0 && s < maxPlayers);

  const hosts = {};
  let insecure = 0;
  for (const [obj] of walkObjects(top)) {
    for (const raw of collectUrls(obj)) {
      const { scheme, host } = urlHost(sanitizeUrl(raw));
      if (scheme !== 'https') insecure += 1;
      const h = (hosts[host] ??= { urls: 0 });
      h.urls += 1;
    }
  }

  const scripts = { global: false, objects: 0, xmlUi: false, bytes: 0 };
  scripts.global = Boolean(save.LuaScript);
  scripts.xmlUi = Boolean(save.XmlUI);
  for (const [obj] of walkObjects(top)) {
    if (obj.LuaScript) scripts.objects += 1;
    if (obj.XmlUI) scripts.xmlUi = true;
  }
  const callSet = new Set();
  const eventSet = new Set();
  let luaErrors = 0;
  for (const { src } of luaSources(save)) {
    scripts.bytes += src.length;
    const r = analyzeLua(src);
    if (!r.ok) luaErrors += 1;
    r.calls.forEach((c) => callSet.add(c));
    r.events.forEach((e) => eventSet.add(e));
  }
  const calls = [...callSet].sort();
  const events = [...eventSet].sort();

  const outOfScope =
    [...walkObjects(top)].some(([o]) => o.Name === 'Custom_Assetbundle') ||
    calls.some((c) => OUT_OF_SCOPE_CALLS.has(c) || SPAWN_PHYSICS.has(c));

  const checks = {
    parsed: !parseError,
    decksComplete,
    noGuidCollisions: guidCollisions === 0,
    seatsOk,
    imagesHttps: insecure === 0,
  };
  const aOk = Object.values(checks).every(Boolean);
  const hasScripts = scripts.global || scripts.objects > 0;
  const covered = (set) => calls.every((c) => set.has(c));
  let tier = 'none';
  if (outOfScope) tier = 'D';
  else if (aOk) tier = 'A';
  if (tier === 'A' && hasScripts && covered(IMPLEMENTED.translatable)) tier = 'B';
  if (tier === 'B' && covered(IMPLEMENTED.shim) && events.every((e) => IMPLEMENTED.shim.has(e)))
    tier = 'C';
  // Projection: tiers reachable once the planned translator (slice 8) / shim (slice 9) exist.
  // A mod without scripts has nothing left to translate.
  const projection = {
    B: !outOfScope && (!hasScripts || covered(PLANNED_TRANSLATABLE)),
    C: !outOfScope && (!hasScripts || covered(PLANNED_SHIM)),
  };

  return {
    name: save.SaveName ?? '',
    tier,
    checks,
    projection,
    objects,
    guidCollisions,
    decks,
    seats: { count: seats.length, maxPlayers },
    images: { insecure, hosts },
    scripts: { ...scripts, luaErrors, calls, events },
    ...(parseError ? { parseError } : {}),
  };
}

/** Aggregate per-mod results: mods per tier and the top-N Lua calls/events by number of mods. */
export function aggregate(mods, topN = 20) {
  const perTier = { none: 0, A: 0, B: 0, C: 0, D: 0 };
  const callCount = new Map();
  const eventCount = new Map();
  const projected = { B: 0, C: 0 };
  for (const m of mods) {
    perTier[m.tier] = (perTier[m.tier] ?? 0) + 1;
    if (m.projection?.B) projected.B += 1;
    if (m.projection?.C) projected.C += 1;
    for (const c of m.scripts.calls) callCount.set(c, (callCount.get(c) ?? 0) + 1);
    for (const e of m.scripts.events) eventCount.set(e, (eventCount.get(e) ?? 0) + 1);
  }
  const top = (map) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, topN)
      .map(([name, mods]) => ({ name, mods }));
  return {
    mods: mods.length,
    perTier,
    projected,
    topCalls: top(callCount),
    topEvents: top(eventCount),
  };
}

/** Regression gate: returns the mods whose tier dropped from `before` to `after` (maps id → tier). */
const ORDER = { none: 0, D: 0, A: 1, B: 2, C: 3 };
export function tierRegressions(before, after) {
  return Object.keys(before).filter(
    (id) => id in after && (ORDER[after[id]] ?? 0) < (ORDER[before[id]] ?? 0),
  );
}
