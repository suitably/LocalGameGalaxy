/** A player as the host lists it in its game state. */
export interface HostStatePlayer {
  deviceId?: string;
  config?: { deviceId?: string; hidePitch?: boolean };
}

/**
 * Whether the host scores this phone in the running song: the phone is one of the session's
 * players and its pitch is shown. Null when the host sent no player list (nothing known).
 *
 * This is separate from the phone's permission role (admin, queue manager, …): the role says
 * what the phone may control, this says whether its microphone is needed.
 */
export function isPhoneSinging(
  players: readonly HostStatePlayer[] | undefined,
  deviceId: string,
): boolean | null {
  if (!players || !deviceId) return null;
  const me = players.find((p) => (p.config?.deviceId ?? p.deviceId) === deviceId);
  return Boolean(me && !me.config?.hidePitch);
}
