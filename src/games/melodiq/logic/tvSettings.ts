import { pickTvSettings, type SettingsState } from '../hooks/settingsStorage';

const sameValue = (a: unknown, b: unknown): boolean =>
  a === b || (typeof a === 'object' && JSON.stringify(a) === JSON.stringify(b));

/**
 * Applies the settings the host sent to a TV (`SETTINGS_UPDATE`). Only TV settings with the same
 * type as the current value are taken; returns `current` itself when nothing changed, so React
 * skips the render. The TV only applies them: it never stores or publishes them again, otherwise
 * two listeners in the TV tab would echo them to each other forever.
 */
export function mergeHostSettings(current: SettingsState, payload: unknown): SettingsState {
  if (!payload || typeof payload !== 'object') return current;
  const patch = pickTvSettings(payload as Partial<SettingsState>);
  let next: SettingsState | null = null;
  for (const [key, value] of Object.entries(patch) as [keyof SettingsState, unknown][]) {
    if (typeof value !== typeof current[key] || sameValue(current[key], value)) continue;
    next ??= { ...current };
    (next as unknown as Record<string, unknown>)[key] = value;
  }
  return next ?? current;
}
