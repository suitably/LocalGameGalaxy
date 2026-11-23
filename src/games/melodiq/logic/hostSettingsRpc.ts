import { LYRICS_MIN_FIT_OPTIONS } from '../gameplay/logic/lyricsFit';
import type { HostSettings } from '../types';

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
  lyricsRows: (v) => (v === 1 || v === 2 ? v : undefined),
  lyricsMinFit: (v) => (LYRICS_MIN_FIT_OPTIONS.some((option) => option === v) ? v : undefined),
  lyricsPosition: oneOf('bottom', 'center'),
  showNoteLabels: bool,
  showScoreboardQrCode: bool,
};

export const HOST_SETTING_KEYS = Object.keys(VALIDATORS) as (keyof HostSettings)[];

/**
 * The patch guard: keeps only keys of `HostSettings` whose value has the right type (and range);
 * unknown keys and invalid values in `raw` are dropped, never applied.
 */
export function sanitizeHostSettingsPatch(raw: unknown): Partial<HostSettings> {
  const out: Record<string, unknown> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of HOST_SETTING_KEYS) {
    const value = VALIDATORS[key]((raw as Record<string, unknown>)[key]);
    if (value !== undefined) out[key] = value;
  }
  return out as Partial<HostSettings>;
}

/** Copies the remotely editable values out of the full settings. */
export function pickHostSettings(settings: HostSettings): HostSettings {
  const out: Record<string, unknown> = {};
  for (const key of HOST_SETTING_KEYS) out[key] = settings[key];
  return out as unknown as HostSettings;
}

/** Only admins may read or change host settings. */
export const canEditHostSettings = (role: string | undefined): boolean => role === 'admin';

/** Phone to host: ask for the host's current settings. `from` is stamped by the host transport. */
export interface HostSettingsGetEvent {
  type: 'settings.get';
  from: string;
}

/** Phone to host: change host settings (admins only). `patch` passes the patch guard on receipt. */
export interface HostSettingsSetEvent {
  type: 'settings.set';
  from: string;
  patch: Partial<HostSettings>;
}

/** Host to the requesting phone (`to` = the request's `from`): the host's current values. */
export interface HostSettingsStateEvent {
  type: 'settings.state';
  /** Host id. */
  from: string;
  to: string;
  settings: HostSettings;
}

export type HostSettingsRequest = HostSettingsGetEvent | HostSettingsSetEvent;
export type HostSettingsEvent = HostSettingsRequest | HostSettingsStateEvent;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const nonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

/** Narrows a received room event to a settings request (patch guarded), or null. */
export function parseHostSettingsRequest(data: unknown): HostSettingsRequest | null {
  if (!isRecord(data) || !nonEmptyString(data.from)) return null;
  if (data.type === 'settings.get') return { type: 'settings.get', from: data.from };
  if (data.type === 'settings.set') {
    return { type: 'settings.set', from: data.from, patch: sanitizeHostSettingsPatch(data.patch) };
  }
  return null;
}

/** Narrows a received room event to a complete, valid settings reply, or null. */
export function parseHostSettingsState(data: unknown): HostSettingsStateEvent | null {
  if (!isRecord(data) || data.type !== 'settings.state' || !nonEmptyString(data.to)) return null;
  const settings = sanitizeHostSettingsPatch(data.settings);
  if (HOST_SETTING_KEYS.some((key) => settings[key] === undefined)) return null;
  return {
    type: 'settings.state',
    from: typeof data.from === 'string' ? data.from : '',
    to: data.to,
    settings: settings as HostSettings,
  };
}

export interface HostSettingsHostDeps {
  /** Role of a device id (`getRoleForDevice`); called with the transport-stamped `from` only. */
  getRole: (deviceId: string) => string | undefined;
  getSettings: () => HostSettings;
  /** Applies a guarded patch to the host's settings (and storage). */
  apply: (patch: Partial<HostSettings>) => void;
  /** Publishes a reply on the room channel. */
  send: (event: HostSettingsStateEvent) => void;
  /** The host's own id, used as `from` of replies. */
  selfId: string;
  onDenied?: (request: HostSettingsRequest, role: string | undefined) => void;
}

/**
 * Host handler for one room event: ignores everything except a valid settings request, denies
 * (no reply, nothing applied) unless the stamped sender `from` is an admin, applies a `set` patch
 * and answers the sender (`to`) with the merged settings.
 */
export function handleHostSettingsEvent(event: unknown, deps: HostSettingsHostDeps): void {
  const rpc = parseHostSettingsRequest(event);
  if (!rpc) return;
  const role = deps.getRole(rpc.from);
  if (!canEditHostSettings(role)) {
    deps.onDenied?.(rpc, role);
    return;
  }
  let settings = pickHostSettings(deps.getSettings());
  if (rpc.type === 'settings.set' && Object.keys(rpc.patch).length > 0) {
    deps.apply(rpc.patch);
    settings = { ...settings, ...rpc.patch };
  }
  deps.send({ type: 'settings.state', from: deps.selfId, to: rpc.from, settings });
}
