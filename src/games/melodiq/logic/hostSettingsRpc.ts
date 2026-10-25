import type { HostSettings, HostSettingsRpc } from '../types';

type Validator = (value: unknown) => unknown;

const clamp01 = (v: unknown) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : undefined;
const bool = (v: unknown) => (typeof v === 'boolean' ? v : undefined);
const oneOf =
  (...allowed: string[]): Validator =>
  (v) =>
    typeof v === 'string' && allowed.includes(v) ? v : undefined;

/** Allowed host settings with their value validators (clamping / enum check). */
const VALIDATORS: Record<keyof HostSettings, Validator> = {
  songVolume: clamp01,
  masterVolume: clamp01,
  vocalsVolume: clamp01,
  audioPlaybackMode: oneOf('separated', 'original'),
  lyricsScale: (v) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(3, Math.max(0.5, v)) : undefined,
  enableLyricsZoom: bool,
  lyricsLines: (v) =>
    Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 3 ? v : undefined,
  lyricsPosition: oneOf('bottom', 'center'),
  showNoteLabels: bool,
  showScoreboardQrCode: bool,
};

export const HOST_SETTING_KEYS = Object.keys(VALIDATORS) as (keyof HostSettings)[];

/** Keeps only known keys with valid values; everything else in `raw` is dropped. */
export function sanitizeHostSettingsPatch(raw: unknown): Partial<HostSettings> {
  const out: Record<string, unknown> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of HOST_SETTING_KEYS) {
    const value = VALIDATORS[key]((raw as Record<string, unknown>)[key]);
    if (value !== undefined) out[key] = value;
  }
  return out as Partial<HostSettings>;
}

/** Narrows a received data-channel message to a host settings request, or null. */
export function parseHostSettingsRpc(data: unknown): HostSettingsRpc | null {
  if (!data || typeof data !== 'object') return null;
  const msg = data as { type?: unknown; patch?: unknown };
  if (msg.type === 'host.settings.get') return { type: 'host.settings.get' };
  if (msg.type === 'host.settings.set') {
    return { type: 'host.settings.set', patch: sanitizeHostSettingsPatch(msg.patch) };
  }
  return null;
}

/** Copies the remotely editable values out of the full settings. */
export function pickHostSettings(settings: HostSettings): HostSettings {
  const out: Record<string, unknown> = {};
  for (const key of HOST_SETTING_KEYS) out[key] = settings[key];
  return out as unknown as HostSettings;
}

/** Only admins may read or change host settings. */
export const canEditHostSettings = (role: string | undefined): boolean => role === 'admin';
