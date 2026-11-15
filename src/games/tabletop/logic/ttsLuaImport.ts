/**
 * Runs the Lua translator on a TTS import [ID: LOGIC-TABLETOP-TTS-LUA-IMPORT]
 *
 * Glue between `parseTtsSaveFile` and `luaTranslator.ts`: builds the targets (converted
 * top-level objects by GUID, with their TTS state numbers) and the colour → hand map, adds the
 * translated buttons to the widgets and the coverage to the import report.
 */
import type { ImportReport, TabletopWidget } from './types';
import type { TTSObjectState, TTSSaveFile } from './ttsTypes';
import { translateTtsScripts, type LuaTarget, type LuaTranslateContext } from './luaTranslator';
import type { GameScripts } from './importTypes';

/**
 * TTS state numbers in the order `attachStates` lays out `states`: the current state first (the
 * number missing from `States`), then the others ascending.
 */
export function ttsStateNumbers(states: Record<string, unknown>): number[] {
  const others = Object.keys(states)
    .map(Number)
    .filter((n) => Number.isInteger(n))
    .sort((a, b) => a - b);
  let current = 1;
  while (others.includes(current)) current += 1;
  return [current, ...others];
}

function targetOf(obj: TTSObjectState, widget: TabletopWidget): LuaTarget {
  return {
    id: widget.id,
    type: widget.type,
    x: widget.x,
    y: widget.y,
    width: widget.width,
    height: widget.height,
    zIndex: widget.zIndex,
    scaleX: obj.Transform.scaleX || 1,
    scaleZ: obj.Transform.scaleZ || 1,
    ...(widget.states?.length && obj.States ? { states: ttsStateNumbers(obj.States) } : {}),
  };
}

export interface LuaImportInput {
  save: TTSSaveFile;
  scripts: GameScripts | undefined;
  widgets: Record<string, TabletopWidget>;
  /** TTS GUID → widget id of the converted top-level object. */
  guidIds: Map<string, string>;
  /** TTS player colour → seat index, and hand GUID → seat index (`assignSeats`). */
  seats: { byColor: Map<string, number>; byGuid: Map<string, number> };
  scale: number;
}

/** Translates the scripts, adds the buttons to `widgets` and returns the report fields. */
export function applyLuaTranslation(
  input: LuaImportInput,
): Pick<ImportReport, 'buttons' | 'untranslated'> {
  const { save, widgets, guidIds, seats } = input;
  const targets: Record<string, LuaTarget> = {};
  for (const obj of save.ObjectStates) {
    const id = guidIds.get(obj.GUID);
    if (id && widgets[id] && !targets[obj.GUID]) targets[obj.GUID] = targetOf(obj, widgets[id]);
  }
  const hands: Record<string, string> = {};
  for (const [color, seat] of seats.byColor) {
    const guid = [...seats.byGuid].find(([, s]) => s === seat)?.[0];
    if (guid && widgets[guid]?.type === 'holder') hands[color] = guid;
  }
  const ctx: LuaTranslateContext = { targets, hands, scale: input.scale };
  const lua = translateTtsScripts(input.scripts, ctx);
  for (const button of lua.buttons) {
    let id = button.id;
    for (let n = 2; widgets[id]; n++) id = `${button.id}~${n}`;
    widgets[id] = { ...button, id };
  }
  if (lua.coverage.total === 0 && lua.untranslated.length === 0) return {};
  return { buttons: lua.coverage, untranslated: lua.untranslated };
}
