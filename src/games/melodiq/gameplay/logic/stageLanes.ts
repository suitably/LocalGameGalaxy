/**
 * Whose pitch lanes a screen shows [ID: LOGIC-MELODIQ-STAGE-LANES]
 *
 * A shared screen (TV, laptop, tablet) shows every singer. A phone is one singer's own screen:
 * a phone client shows the lane of its own singer, and a phone that hosts shows the singers on
 * its own microphone as long as no TV is connected. With a TV the hosting phone is the
 * controller of the shared screen and keeps every lane.
 */
export type LaneScope =
  | { kind: 'all' }
  /** Singers using this device's microphone (hosting phone). */
  | { kind: 'local' }
  /** The singer of one phone client. */
  | { kind: 'device'; deviceId: string };

export interface LaneScopeInput {
  isClient: boolean;
  clientDeviceId?: string;
  /** This device is a phone (see `isPhoneScreen`). */
  isPhone: boolean;
  /** A TV shows the stage (the host only mirrors and controls it). */
  hasTv: boolean;
  /** TV view or another passive mirror: always everything the host sends. */
  isMirror: boolean;
}

export function laneScope({
  isClient,
  clientDeviceId,
  isPhone,
  hasTv,
  isMirror,
}: LaneScopeInput): LaneScope {
  if (isClient)
    return clientDeviceId ? { kind: 'device', deviceId: clientDeviceId } : { kind: 'all' };
  if (isMirror || hasTv || !isPhone) return { kind: 'all' };
  return { kind: 'local' };
}

interface LanePlayer {
  config: { id: string; deviceId?: string; isRemote?: boolean };
}

/** Players whose lane belongs on this screen. */
export function playersInScope<P extends LanePlayer>(players: P[], scope: LaneScope): P[] {
  if (scope.kind === 'all') return players;
  if (scope.kind === 'local') return players.filter((p) => !p.config.isRemote);
  return players.filter(
    (p) => p.config.deviceId === scope.deviceId || p.config.id === scope.deviceId,
  );
}

/** Shorter screen side up to which a touch device counts as a phone (tablets are shared screens). */
const PHONE_MAX_SHORT_SIDE = 600;

/** A touch-first device with a phone-sized screen, in either orientation. */
export const isPhoneScreen = (coarsePointer: boolean, width: number, height: number): boolean =>
  coarsePointer && Math.min(width, height) > 0 && Math.min(width, height) <= PHONE_MAX_SHORT_SIDE;
