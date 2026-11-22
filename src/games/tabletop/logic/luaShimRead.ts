/**
 * Lua shim: object reads [ID: LOGIC-TABLETOP-LUA-SHIM-READ]
 *
 * TTS getters on the 2D table: position/rotation through the inverse projection, name,
 * description, GM notes, tags, container contents and quantities, the `tag`/`type` field.
 * Pure reads; they never emit an action.
 */
import type { LuaValue } from './luaVm';
import type { ScriptZone, TabletopGameDefinition, TabletopWidget } from './types';
import { widgetRotation, widgetToWorld, type LuaProjection } from './luaProjection';
import { objectRef, type LuaObjectCall } from './luaShimTypes';

type Widgets = Record<string, TabletopWidget>;

/** TTS `tag` (object type name) of a widget. */
export function ttsTag(w: TabletopWidget): string {
  switch (w.type) {
    case 'card':
      return 'Card';
    case 'deck':
      return 'Deck';
    case 'bag':
      return w.isInfinite ? 'Infinite' : 'Bag';
    case 'die':
      return 'Dice';
    case 'counter':
      return 'Counter';
    case 'holder':
      return w.isHand ? 'Hand' : 'Board';
    case 'label':
      return '3DText';
    default:
      return 'Generic';
  }
}

/** Display name: label, else a label/text widget's text. */
export function widgetName(w: TabletopWidget): string {
  if (w.label) return w.label;
  if (w.type === 'label' || w.type === 'button') return w.text;
  return '';
}

const centreIn = (w: TabletopWidget, z: ScriptZone) => {
  const cx = w.x + w.width / 2;
  const cy = w.y + w.height / 2;
  return cx >= z.x && cx <= z.x + z.width && cy >= z.y && cy <= z.y + z.height;
};

/** Top-level widgets whose centre lies in a scripting zone (cards in decks/hands excluded). */
export function widgetsInZone(widgets: Widgets, zone: ScriptZone): TabletopWidget[] {
  const held = new Set<string>();
  for (const w of Object.values(widgets)) {
    if (w.type === 'deck') w.cardIds.forEach((id) => held.add(id));
    if (w.type === 'bag') w.itemIds?.forEach((id) => held.add(id));
    if (w.type === 'holder' && w.isHand) w.childIds.forEach((id) => held.add(id));
  }
  return Object.values(widgets).filter(
    (w) => !held.has(w.id) && w.type !== 'button' && centreIn(w, zone),
  );
}

/** Ids a container holds, in TTS order (index 0 = top of a deck, last drawn from a bag). */
export function containerIds(w: TabletopWidget): string[] | undefined {
  if (w.type === 'deck') return [...w.cardIds].reverse();
  if (w.type === 'bag') return w.isInfinite ? [] : [...(w.itemIds ?? [])].reverse();
  if (w.type === 'holder') return [...w.childIds];
  return undefined;
}

function contents(widgets: Widgets, ids: string[]): LuaValue {
  return ids.map((guid, index) => {
    const w = widgets[guid];
    return { guid, index, name: w ? widgetName(w) : '', description: '', ...objectRef(guid) };
  });
}

export function scriptTags(game: TabletopGameDefinition, guid: string): string[] {
  return game.scripts?.objects[guid]?.tags ?? [];
}

/** Getter result, or `null` when `method` is not a getter. */
export function readObject(call: LuaObjectCall, method: string, args: unknown[]): LuaValue | null {
  const { widget: w, guid, projection, host } = call;
  const game = host.game();
  const meta = host.meta.objects[guid];
  switch (method) {
    case 'getPosition':
      return { ...widgetToWorld(w, projection) };
    case 'getRotation':
      return { ...widgetRotation(w) };
    case 'getName':
      return widgetName(w);
    case 'getDescription':
      return meta?.description ?? game.scripts?.objects[guid]?.description ?? '';
    case 'getGMNotes':
      return meta?.gmNotes ?? game.scripts?.objects[guid]?.gmNotes ?? '';
    case 'getTags':
      return scriptTags(game, guid);
    case 'hasTag':
      return scriptTags(game, guid).includes(String(args[0]));
    case 'getObjects': {
      const ids = containerIds(w);
      return ids ? contents(game.widgets, ids) : [];
    }
    case 'getQuantity': {
      if (w.type === 'bag' && w.isInfinite) return -1;
      return containerIds(w)?.length ?? -1;
    }
    case 'getStateId':
      return w.states?.length ? (w.stateIndex ?? 0) + 1 : -1;
    case 'getLock':
      return Boolean(w.pinned);
    case 'getValue':
      if (w.type === 'counter') return w.value;
      if (w.type === 'die') return w.currentValue;
      return widgetName(w);
    case 'field:tag':
    case 'field:type':
      return ttsTag(w);
    case 'field:name':
      return ttsTag(w);
    case 'field:is_face_down':
      return (w.type === 'card' || w.type === 'deck') && w.faceUp === false;
    default:
      return null;
  }
}

/** Reads on a scripting zone (TTS `ScriptingTrigger`). */
export function readZone(
  game: TabletopGameDefinition,
  zone: ScriptZone,
  method: string,
  projection: LuaProjection,
): LuaValue | null {
  const asWidget = { ...zone, type: 'label', text: '', zIndex: 0 } as TabletopWidget;
  switch (method) {
    case 'getObjects':
      return widgetsInZone(game.widgets, zone).map((w) => objectRef(w.id));
    case 'getPosition':
      return { ...widgetToWorld(asWidget, projection) };
    case 'getName':
      return zone.label ?? '';
    case 'field:tag':
    case 'field:type':
    case 'field:name':
      return 'Scripting';
    default:
      return null;
  }
}
