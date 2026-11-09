/**
 * TTS import fidelity helpers [ID: LOGIC-TABLETOP-TTS-FIDELITY]
 *
 * Unique ids, card orientation, dense seats, rule text and text labels for `ttsParser.ts`
 * (#683). Pure functions; the id registry is module state reset once per import.
 */
import type { LabelWidget, ScriptZone } from './types';
import type { TTSObjectState, TTSSaveFile, TTSTransform } from './ttsTypes';

// ─── Unique ids ──────────────────────────────────────────────────────

const usedIds = new Set<string>();

/** Starts a new import: GUIDs may be used again. */
export function resetIdClaims(): void {
  usedIds.clear();
}

/**
 * TTS repeats GUIDs (copies in several decks, items in two bags). Returns `guid` the first
 * time, then `guid~2`, `guid~3`, … so no widget overwrites another.
 */
export function claimId(guid: string): string {
  let id = guid;
  for (let n = 2; usedIds.has(id); n++) id = `${guid}~${n}`;
  usedIds.add(id);
  return id;
}

// ─── Orientation ─────────────────────────────────────────────────────

const normalizeDeg = (deg: number) => ((Math.round(deg || 0) % 360) + 360) % 360;

/** `rotZ` ≈ 180 is a card lying face down; `rotY` is the turn on the table. */
export function cardOrientation(t: TTSTransform): { faceUp: boolean; rotation: number } {
  const z = normalizeDeg(t.rotZ);
  return { faceUp: z < 90 || z > 270, rotation: normalizeDeg(t.rotY) };
}

// ─── Seats ───────────────────────────────────────────────────────────

/** FogColor order of the TTS player colours. */
export const FOG_COLOR_ORDER = [
  'White',
  'Brown',
  'Red',
  'Orange',
  'Yellow',
  'Green',
  'Teal',
  'Blue',
  'Purple',
  'Pink',
  'Black',
];

/**
 * Dense seat indices (0, 1, 2 …) in FogColor order for the colours of hand triggers and fog zones;
 * hands without a colour follow in file order. Colours beyond `maxPlayers` get no seat.
 */
export function assignSeats(
  hands: TTSObjectState[],
  maxPlayers: number,
  fogColors: string[] = [],
): { byColor: Map<string, number>; byGuid: Map<string, number> } {
  const colors = [
    ...new Set(
      [...hands.map((h) => h.FogColor), ...fogColors].filter((c): c is string => Boolean(c)),
    ),
  ];
  const rank = (c: string) => {
    const i = FOG_COLOR_ORDER.indexOf(c);
    return i < 0 ? FOG_COLOR_ORDER.length : i;
  };
  colors.sort((a, b) => rank(a) - rank(b));
  const byColor = new Map(colors.map((c, i) => [c, i]));
  let next = colors.length;
  const byGuid = new Map<string, number>();
  for (const h of hands) {
    const seat = h.FogColor ? byColor.get(h.FogColor) : next++;
    if (seat !== undefined && seat < maxPlayers) byGuid.set(h.GUID, seat);
  }
  return { byColor, byGuid };
}

// ─── Text ────────────────────────────────────────────────────────────

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Every `TabStates` entry as one rule text (title as heading, body as written). */
export function rulesFromTabs(save: TTSSaveFile, extra: string[] = []): string | undefined {
  const tabs = Object.values(save.TabStates ?? {})
    .filter((t) => t.body?.trim())
    .sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
    .map((t) => `${t.title ? `<h3>${escapeHtml(t.title)}</h3>` : ''}${t.body}`);
  const all = [...tabs, ...extra];
  return all.length > 0 ? all.join('\n') : undefined;
}

/** Rule text of a Notecard/Tablet object (title as heading), `undefined` when it has none. */
export function noteObjectText(obj: TTSObjectState): string | undefined {
  const body = obj.Description?.trim() || obj.GMNotes?.trim();
  if (!body) return undefined;
  const title = obj.Nickname?.trim();
  return `${title ? `<h3>${escapeHtml(title)}</h3>` : ''}${escapeHtml(body).replace(/\n/g, '<br>')}`;
}

/** `3DText` → label widget keeping its text. */
export function convertText(
  obj: TTSObjectState,
  pos: { x: number; y: number; zIndex: number },
  color: string,
): LabelWidget {
  const text = obj.Text?.Text ?? obj.Nickname ?? '';
  return {
    id: claimId(obj.GUID),
    type: 'label',
    x: pos.x,
    y: pos.y,
    width: Math.max(80, Math.min(600, text.length * 14)),
    height: 40,
    zIndex: pos.zIndex,
    text,
    fontSize: Math.min(64, Math.max(14, Math.round((obj.Text?.fontSize ?? 64) / 3))),
    color,
    movable: !obj.Locked,
    pinned: Boolean(obj.Locked),
  };
}

/** `ScriptingTrigger` → invisible zone (kept for scripts, not drawn). */
export function convertScriptZone(
  obj: TTSObjectState,
  center: { x: number; y: number },
  scale: number,
): ScriptZone {
  const width = Math.max(20, Math.round((obj.Transform.scaleX || 1) * scale));
  const height = Math.max(20, Math.round((obj.Transform.scaleZ || 1) * scale));
  return {
    id: obj.GUID,
    x: Math.round(center.x - width / 2),
    y: Math.round(center.y - height / 2),
    width,
    height,
    label: obj.Nickname || undefined,
  };
}

/** True when any (nested) `Custom_Tile` is a hex tile, so snap points can be hex shaped. */
export function hasHexTiles(objects: TTSObjectState[]): boolean {
  return objects.some(
    (o) =>
      (o.Name === 'Custom_Tile' && o.CustomImage?.CustomTile?.Type === 1) ||
      hasHexTiles(o.ContainedObjects ?? []),
  );
}
