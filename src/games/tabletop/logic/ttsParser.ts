/**
 * Tabletop Simulator (TTS) Save File Parser [ID: GAME-TABLETOP-TTS-PARSER]
 *
 * Converts TTS save file JSON (3D ObjectStates) into the Galaxy
 * TabletopGameDefinition (2D widget-based) format.
 */
import { attachStates, convertBag, convertFogOfWar, isTtsBag, tileShape } from './ttsContainers';
import type { TTSSaveFile, TTSObjectState, TTSCustomDeckEntry } from './ttsTypes';
import {
  HEX_CLIP_PATH,
  CIRCLE_CLIP_PATH,
  type TabletopGameDefinition,
  type TabletopWidget,
  type HiddenZone,
  type ScriptZone,
} from './types';
import { validateAndSanitizeGame } from './gameValidator';
import { buildImportReport, extractScripts } from './ttsImportReport';
import { applyLuaTranslation } from './ttsLuaImport';
import {
  assignSeats,
  claimId,
  convertScriptZone,
  convertText,
  hasHexTiles,
  noteObjectText,
  resetIdClaims,
  rulesFromTabs,
} from './ttsFidelity';

import { TTS_SCALE, CARD_W, CARD_H, CUSTOM_TABLE, TTS_TABLE_WIDGET_ID } from './tts/ttsConstants';
import {
  getCardShapeAndSize,
  topLeft,
  ttsColorToHex,
  parseDieSides,
  computeBounds,
  projectPosition,
  calculateWorldPosOfSnapPoint,
  projectWorldPos,
  createSnapHolderWidget,
} from './tts/ttsGeometry';
import { sanitizeTtsUrl, customTableImage, collectCustomDecks } from './tts/ttsUrl';
import { convertCard, convertDeck, resetWidgetIdCounter } from './tts/ttsCardConvert';
import {
  convertDie,
  convertBoard,
  convertToken,
  convertModel,
  convertHandTrigger,
} from './tts/ttsObjectConvert';

export { TTS_TABLE_WIDGET_ID, getCardShapeAndSize, sanitizeTtsUrl };
export { HEX_CLIP_PATH, CIRCLE_CLIP_PATH };

/**
 * Returns true if the parsed JSON looks like a TTS save file.
 */
export function isTtsSaveFile(json: unknown): json is TTSSaveFile {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return false;
  const obj = json as Record<string, unknown>;
  return typeof obj.SaveName === 'string' && Array.isArray(obj.ObjectStates);
}

// ─── Color Helpers ───────────────────────────────────────────────────

export interface TtsParserOptions {
  defaultName?: string;
}

/**
 * Parses a TTS save file into a TabletopGameDefinition.
 */
export function parseTtsSaveFile(
  save: TTSSaveFile,
  options?: TtsParserOptions,
): TabletopGameDefinition {
  // Reset counter
  resetWidgetIdCounter();
  resetIdClaims();

  const widgets: Record<string, TabletopWidget> = {};
  const tableImage = customTableImage(save);
  const bounds = computeBounds(save.ObjectStates, Boolean(tableImage));
  const margin = 80;
  if (tableImage) {
    const size = {
      width: CUSTOM_TABLE.width * TTS_SCALE,
      height: CUSTOM_TABLE.depth * TTS_SCALE,
    };
    widgets[TTS_TABLE_WIDGET_ID] = {
      id: TTS_TABLE_WIDGET_ID,
      type: 'token',
      shape: 'rectangle',
      ...topLeft(projectWorldPos({ x: 0, z: 0 }, bounds, margin), size.width, size.height),
      ...size,
      zIndex: 0,
      label: 'Board',
      labelKey: 'games.tabletop.labels.board',
      image: tableImage,
      imageFit: 'fill',
      movable: false,
      pinned: true,
    };
  }

  // Collect all CustomDeck entries globally
  const globalDecks: Record<string, TTSCustomDeckEntry> = {};
  collectCustomDecks(save.ObjectStates, globalDecks);
  const hasAnyHexDeck =
    Object.values(globalDecks).some((d) => d.Type === 2 || d.Type === 3) ||
    hasHexTiles(save.ObjectStates);

  // HandTrigger seats: dense, in FogColor order, at most maxPlayers
  const maxPlayers = save.PlayerCounts?.[1] ?? 6;
  const seats = assignSeats(
    save.ObjectStates.filter((o) => o.Name === 'HandTrigger'),
    maxPlayers,
    save.ObjectStates.filter((o) => o.Name === 'FogOfWarTrigger').flatMap((o) => o.FogColor ?? []),
  );
  const hiddenZones: Record<string, HiddenZone> = {};
  const scriptZones: Record<string, ScriptZone> = {};
  const noteTexts: string[] = [];

  /** TTS GUID → widget id of each converted top-level object (for the Lua translator). */
  const guidIds = new Map<string, string>();
  const track = (guid: string, id: string) => {
    if (!guidIds.has(guid)) guidIds.set(guid, id);
  };
  /** Top-level widgets whose id is their GUID; repeats get `guid~2`, … */
  const putClaimed = (w: TabletopWidget) => {
    const id = claimId(w.id);
    widgets[id] = { ...w, id };
    track(w.id, id);
  };

  /** Objects inside bags: cards, dice and tiles keep their kind, the rest become tokens. */
  const convertChild = (child: TTSObjectState, p: { x: number; y: number; zIndex: number }) => {
    if (child.Name === 'Card') return convertCard(child, p, globalDecks);
    if (child.Name === 'Custom_Model') {
      const model = convertModel(child, p);
      return { ...model, id: claimId(model.id) };
    }
    const sides = parseDieSides(child.Name);
    if (sides !== null) {
      const die = convertDie(child, p, sides);
      return { ...die, id: claimId(die.id) };
    }
    const w =
      child.Name === 'Custom_Tile'
        ? { ...convertToken(child, p), ...tileShape(child) }
        : convertToken(child, p);
    return { ...w, id: claimId(w.id) };
  };

  // Process all top-level objects
  for (const obj of save.ObjectStates) {
    const pos = projectPosition(obj, bounds, margin);
    const name = obj.Name;

    // AttachedSnapPoints on objects
    if (obj.AttachedSnapPoints && obj.AttachedSnapPoints.length > 0) {
      for (let i = 0; i < obj.AttachedSnapPoints.length; i++) {
        const sp = obj.AttachedSnapPoints[i];
        const worldPos = calculateWorldPosOfSnapPoint(obj, sp.Position);
        const screenPos = projectWorldPos(worldPos, bounds, margin);
        const holderId = `snap_${obj.GUID}_${i}`;
        const holder = createSnapHolderWidget(
          holderId,
          screenPos.x,
          screenPos.y,
          (pos.zIndex || 0) + 1,
          sp,
          hasAnyHexDeck,
        );
        widgets[holder.id] = holder;
      }
    }

    // Skip meta-only objects
    if (name === 'Custom_Assetbundle' || name === 'Custom_PDF') continue;

    // HandTrigger → player hand
    if (name === 'HandTrigger') {
      const seat = seats.byGuid.get(obj.GUID);
      if (seat === undefined) continue;
      const hand = convertHandTrigger(obj, pos, seat);
      widgets[hand.id] = hand;
      track(obj.GUID, hand.id);
      continue;
    }

    // Dice
    const dieSides = parseDieSides(name);
    if (dieSides !== null) {
      putClaimed(convertDie(obj, pos, dieSides));
      continue;
    }

    // Deck / DeckCustom
    if (name === 'Deck' || name === 'DeckCustom') {
      const deck = convertDeck(obj, pos, globalDecks, widgets);
      widgets[deck.id] = deck;
      track(obj.GUID, deck.id);
      continue;
    }

    // Single Card (not inside a deck)
    if (name === 'Card') {
      const single = convertCard(obj, pos, globalDecks);
      widgets[single.id] = single;
      track(obj.GUID, single.id);
      continue;
    }

    // Bag / Infinite_Bag → BagWidget (finite contents or infinite template)
    if (isTtsBag(name)) {
      const bag = convertBag(obj, pos, ttsColorToHex(obj.ColorDiffuse), convertChild, widgets);
      widgets[bag.id] = bag;
      track(obj.GUID, bag.id);
      continue;
    }

    // FogOfWarTrigger → hidden zone for the seat of its fog colour
    if (name === 'FogOfWarTrigger') {
      const zone = convertFogOfWar(
        obj,
        pos,
        TTS_SCALE,
        obj.FogColor ? seats.byColor.get(obj.FogColor) : undefined,
        ttsColorToHex(obj.ColorDiffuse),
      );
      hiddenZones[zone.id] = zone;
      continue;
    }

    // Custom_Tile → token with the tile's shape (box, hex, circle, rounded)
    if (name === 'Custom_Tile') {
      putClaimed({ ...convertToken(obj, pos), ...tileShape(obj) });
      continue;
    }

    // Custom_Board → convert to pinned board token widget
    if (name === 'Custom_Board') {
      putClaimed(convertBoard(obj, pos));
      continue;
    }

    // 3DText → label widget; ScriptingTrigger → invisible zone for scripts
    if (name === '3DText') {
      const text = convertText(obj, pos, ttsColorToHex(obj.Text?.colorstate));
      widgets[text.id] = text;
      track(obj.GUID, text.id);
      continue;
    }
    if (name === 'ScriptingTrigger') {
      scriptZones[obj.GUID] = convertScriptZone(obj, pos, TTS_SCALE);
      continue;
    }
    if (name.startsWith('Notecard') || name.startsWith('Tablet')) {
      const note = noteObjectText(obj);
      if (note) noteTexts.push(note);
      continue;
    }

    // Custom_Model → diffuse texture as sprite, else labelled token (D7)
    if (name === 'Custom_Model') {
      putClaimed(convertModel(obj, pos));
      continue;
    }

    // Figurine_Custom, Custom_Token, backgammon_piece_*, PiecePack_* → Token
    if (
      name === 'Figurine_Custom' ||
      name === 'Custom_Token' ||
      name.startsWith('backgammon_piece') ||
      name.startsWith('PiecePack_')
    ) {
      putClaimed(convertToken(obj, pos));
      continue;
    }

    // Default fallback: generic token for any unrecognized object
    if (!name.startsWith('Notecard') && !name.startsWith('Tablet')) {
      putClaimed(convertToken(obj, pos));
    }
  }

  // TTS States → switchable looks on the converted widget
  for (const obj of save.ObjectStates) {
    const w = widgets[obj.GUID];
    if (w && obj.States) {
      const pos = projectPosition(obj, bounds, margin);
      widgets[obj.GUID] = attachStates(w, obj, (state) => convertChild(state, pos));
    }
  }

  // Global snap points
  if (save.SnapPoints && save.SnapPoints.length > 0) {
    for (let i = 0; i < save.SnapPoints.length; i++) {
      const sp = save.SnapPoints[i];
      const screenPos = projectWorldPos({ x: sp.Position.x, z: sp.Position.z }, bounds, margin);
      const holderId = `snap_global_${i}`;
      const holder = createSnapHolderWidget(
        holderId,
        screenPos.x,
        screenPos.y,
        1,
        sp,
        hasAnyHexDeck,
      );
      widgets[holder.id] = holder;
    }
  }

  // Calculate table dimensions from projected bounds
  const tableWidth = Math.round((bounds.maxX - bounds.minX) * TTS_SCALE + margin * 2 + 200);
  const tableHeight = Math.round((bounds.maxZ - bounds.minZ) * TTS_SCALE + margin * 2 + 200);

  const ruleText = rulesFromTabs(save, noteTexts);
  const scripts = extractScripts(save);
  const luaReport = applyLuaTranslation({
    save,
    scripts,
    widgets,
    guidIds,
    seats,
    scale: TTS_SCALE,
    // Scripts place cards: the corner of a standard card centred on the world position.
    project: (x, z) => topLeft(projectWorldPos({ x, z }, bounds, margin), CARD_W, CARD_H),
  });

  return validateAndSanitizeGame({
    name: save.SaveName || options?.defaultName || 'TTS Import',
    description: save.Note || '',
    author: 'Steam Workshop',
    version: save.VersionNumber || '1.0.0',
    minPlayers: save.PlayerCounts?.[0] ?? 1,
    maxPlayers,
    table: {
      width: Math.max(1600, tableWidth),
      height: Math.max(1000, tableHeight),
      backgroundColor: '#1a472a',
    },
    widgets,
    ruleText,
    ...(Object.keys(hiddenZones).length > 0 ? { hiddenZones } : {}),
    ...(Object.keys(scriptZones).length > 0 ? { scriptZones } : {}),
    importReport: { ...buildImportReport(save, sanitizeTtsUrl), ...luaReport },
    scripts,
    format: 'tts-workshop',
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────
