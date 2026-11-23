import type { StrumMode, StrumSetting } from '../../../core/types';

/**
 * Strum direction overrides of one guitar part in `song.json` (#634): `{ mode?: 'down' | 'up',
 * bars?: { <played bar number>: 'auto' | 'down' | 'up' } }`. Defaults are dropped.
 */
const MAX_BARS = 2000;
const MODES: readonly string[] = ['auto', 'down', 'up'];

/** Checks a part's strum setting; returns it (undefined when nothing differs) or an error. */
export function parseStrumSetting(raw: unknown): StrumSetting | undefined | string {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) return 'strum must be an object';
  const v = raw as Record<string, unknown>;
  if (v.mode !== undefined && !MODES.includes(v.mode as string)) {
    return "strum mode must be 'auto', 'down' or 'up'";
  }
  const mode = v.mode === 'down' || v.mode === 'up' ? v.mode : undefined;
  const out: StrumSetting = {};
  if (mode) out.mode = mode;
  if (v.bars !== undefined) {
    if (!v.bars || typeof v.bars !== 'object' || Array.isArray(v.bars)) {
      return 'strum bars must be an object';
    }
    const entries = Object.entries(v.bars as Record<string, unknown>);
    if (entries.length > MAX_BARS) return 'too many strum bars';
    const bars: Record<string, StrumMode> = {};
    for (const [bar, value] of entries) {
      if (!/^[1-9]\d{0,4}$/.test(bar)) return 'strum bar must be a bar number';
      if (!MODES.includes(value as string)) return "strum bar must be 'auto', 'down' or 'up'";
      if (value !== (mode ?? 'auto')) bars[bar] = value as StrumMode;
    }
    if (Object.keys(bars).length) out.bars = bars;
  }
  return Object.keys(out).length ? out : undefined;
}
