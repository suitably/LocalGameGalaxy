/**
 * Games this app exported itself [ID: LOGIC-TABLETOP-NATIVE-GAME-FILE]
 *
 * "Export as .json" writes a `TabletopGameDefinition`. Read back, it is already in our schema, so
 * it is only validated — never run through the VirtualTabletop/PCIO converter, which would
 * re-layer the stacking order and drop routines.
 */
import type { TabletopGameDefinition } from './types';
import { validateAndSanitizeGame, type RawTabletopGameInput } from './gameValidator';
import { parseRoutine, parseTriggers } from './routines';

const isRecord = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** Our own export: `supportedModes`, a `table` and widgets that already carry a `zIndex`. */
export function isNativeGameFile(json: unknown): boolean {
  if (!isRecord(json) || !Array.isArray(json.supportedModes)) return false;
  if (!isRecord(json.table) || !isRecord(json.widgets)) return false;
  return Object.values(json.widgets).every(
    (w) => isRecord(w) && typeof w.type === 'string' && typeof w.zIndex === 'number',
  );
}

/** The game of a native export; button routines and triggers that do not validate are emptied. */
export function parseNativeGameFile(json: unknown): TabletopGameDefinition {
  const raw = json as RawTabletopGameInput;
  const widgets = Object.fromEntries(
    Object.entries(raw.widgets as Record<string, Record<string, unknown>>).map(([id, w]) => {
      if (w.type !== 'button') return [id, w];
      const routine = parseRoutine(w.routine ?? []);
      const triggers = w.triggers === undefined ? undefined : parseTriggers(w.triggers);
      return [
        id,
        {
          ...w,
          routine: routine.ok ? routine.routine : [],
          ...(triggers ? { triggers: triggers.ok ? triggers.triggers : [] } : {}),
        },
      ];
    }),
  );
  return validateAndSanitizeGame({ ...raw, widgets } as RawTabletopGameInput);
}
