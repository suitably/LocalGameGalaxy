/**
 * Pure roster rules for a Melodiq singing session [ID: LOGIC-MELODIQ-SESSION-ROSTER]
 *
 * Which participants become players and which microphone each local singer gets.
 * No audio, WebRTC or React — `useSessionPlayers` turns these configs into `PlayerRuntime`s.
 */
import { storage, STORAGE_KEYS } from '../../../../lib/storage';
import type { ActivePlayer, UserProfile } from '../../types';

export const BOT_PROFILE_ID = 'BOT';

/** Constructor input of `PlayerRuntime`. */
export type PlayerConfig = UserProfile & {
  deviceId?: string;
  volume?: number;
  muted?: boolean;
  latency?: number;
  isRemote?: boolean;
  hidePitch?: boolean;
};

export const BOT_PLAYER_CONFIG: PlayerConfig = {
  id: BOT_PROFILE_ID,
  name: 'Bot',
  hue: 330,
  deviceId: BOT_PROFILE_ID,
  volume: 0.8,
  muted: false,
  latency: 0,
  isRemote: false,
};

export interface SessionInputs {
  /** `null` when no profiles were ever saved on this device. */
  profiles: UserProfile[] | null;
  activeSession: ActivePlayer[];
  micSlots: string[];
}

/** Reads profiles, the active session (unless overridden) and mic slots from storage. */
export function loadSessionInputs(override?: ActivePlayer[] | null): SessionInputs {
  const profiles = storage.getJson<UserProfile[] | null>(STORAGE_KEYS.PROFILES, null);
  const activeSession =
    override ?? storage.getJson<ActivePlayer[]>(STORAGE_KEYS.ACTIVE_SESSION, []);
  const micSlots = storage.getJson<string[]>(STORAGE_KEYS.MELODIQ_MIC_SLOTS, []);
  return { profiles, activeSession, micSlots };
}

const usesLocalMic = (p: ActivePlayer) => !p.isRemote && p.profileId !== BOT_PROFILE_ID;

/**
 * Gives local singers the mic slots in order; local singers without a slot are dropped.
 * Remote phones and the bot need no microphone and are kept as they are.
 */
export function assignMicSlots(activeSession: ActivePlayer[], micSlots: string[]): ActivePlayer[] {
  let slot = 0;
  return activeSession
    .map((p) => (usesLocalMic(p) ? { ...p, deviceId: micSlots[slot++] || '' } : p))
    .filter((p) => !usesLocalMic(p) || p.deviceId !== '');
}

/** Player configs for the session start; participants without a saved profile are skipped. */
export function buildInitialConfigs(
  activeSession: ActivePlayer[],
  profiles: UserProfile[],
): PlayerConfig[] {
  return activeSession.flatMap((p): PlayerConfig[] => {
    if (p.profileId === BOT_PROFILE_ID) return [BOT_PLAYER_CONFIG];
    const profile = profiles.find((prof) => prof.id === p.profileId);
    if (!profile) return [];
    return [
      {
        ...profile,
        deviceId: p.deviceId,
        volume: p.volume ?? 1.0,
        muted: p.muted ?? false,
        latency: p.latency ?? 0,
        isRemote: p.isRemote ?? false,
        hidePitch: p.hidePitch ?? false,
      },
    ];
  });
}

/** Every device and profile id the host listed for the session. */
export function collectSessionKeys(override: ActivePlayer[]): Set<string> {
  const keys = new Set<string>();
  for (const p of override) {
    if (p.deviceId) keys.add(p.deviceId);
    if (p.profileId) keys.add(p.profileId);
  }
  return keys;
}

/** Without a host list everyone is wanted; otherwise one of `ids` must be on it. */
export function isWantedByHost(
  override: ActivePlayer[] | null | undefined,
  ids: (string | undefined)[],
): boolean {
  if (override === null || override === undefined) return true;
  const keys = collectSessionKeys(override);
  return ids.some((id) => Boolean(id) && keys.has(id as string));
}
