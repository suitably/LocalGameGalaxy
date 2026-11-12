/**
 * VirtualTabletop / PCIO `clickRoutine` → routine steps, trivial subset [ID: LOGIC-TABLETOP-VTT-ROUTINES]
 *
 * Only straight-line steps that name their widgets directly are mapped (Q15 part 1): `SHUFFLE` of
 * a holder, `MOVE` n cards between holders, `ROLL` / `FLIP` of an id list, `TIMER` toggle/reset.
 * Anything else (collections from `SELECT`, variables, `IF`, `CALL` …) makes the whole routine
 * untranslated: the button imports without a routine, as before, so it never runs half a script.
 * Property names follow the VirtualTabletop file format; no code is taken from that project.
 */
import type { RoutineStep } from './types';
import { MAX_DRAW_COUNT, MAX_ROUTINE_STEPS } from './routines';

const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const ids = (v: unknown): string[] | null =>
  Array.isArray(v) && v.length > 0 && v.every(isStr) ? v : null;

function vttStep(raw: unknown): RoutineStep | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const s = raw as Record<string, unknown>;
  switch (s.func) {
    case 'SHUFFLE':
      return isStr(s.holder) ? { op: 'SHUFFLE', deck: s.holder } : null;
    case 'MOVE': {
      const count = s.count ?? 1;
      if (!isStr(s.from) || !isStr(s.to) || typeof count !== 'number') return null;
      if (!Number.isInteger(count) || count < 1 || count > MAX_DRAW_COUNT) return null;
      return { op: 'DRAW', deck: s.from, count, to: s.to };
    }
    case 'ROLL': {
      const dice = ids(s.collection);
      return dice ? { op: 'ROLL', dice } : null;
    }
    case 'FLIP': {
      const cards = ids(s.collection);
      return cards ? { op: 'FLIP', cards } : null;
    }
    case 'TIMER':
      return isStr(s.timer) && (s.mode === 'toggle' || s.mode === 'reset')
        ? { op: 'TIMER', timer: s.timer, action: s.mode }
        : null;
    default:
      return null;
  }
}

/** The routine for a VTT `clickRoutine`, or `[]` when any step is outside the mapped subset. */
export function vttClickRoutine(raw: unknown): RoutineStep[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_ROUTINE_STEPS) return [];
  const steps = raw.map(vttStep);
  return steps.every((s): s is RoutineStep => s !== null) ? steps : [];
}
