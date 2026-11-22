/** Phone remote control as room events: pure guard, types and host handler. */

/**
 * Every command that is sent or handled today. The playback names are lower case, the rest keeps
 * the spelling of the old data-channel protocol.
 */
export const REMOTE_COMMANDS = [
  'play',
  'pause',
  'toggle',
  'next',
  'restart',
  'exit',
  'UPDATE_PROFILE',
  'session.join_mode',
  'CALIBRATE_PLAY_BEEP',
  'CALIBRATE_BEEP',
  'PING',
  'PONG',
] as const;

export type RemoteCommandName = (typeof REMOTE_COMMANDS)[number];

/** Phone to host (and host to phone for `PONG`): one remote-control command. */
export interface RemoteCommandEvent {
  type: 'remote.command';
  /** Sender device id (stamped by the host transport). */
  from: string;
  command: RemoteCommandName;
  /** Command payload: `{ latency }`, `{ mode }`, the host time for `PONG`; absent otherwise. */
  value?: unknown;
  /** Set on targeted replies (`PONG`): only this device handles the event. */
  to?: string;
}

export const isRemoteCommandName = (value: unknown): value is RemoteCommandName =>
  typeof value === 'string' && (REMOTE_COMMANDS as readonly string[]).includes(value);

/** Narrows a received room event to a remote command; unknown commands and a missing `from` are rejected. */
export function parseRemoteCommand(data: unknown): RemoteCommandEvent | null {
  if (!data || typeof data !== 'object') return null;
  const msg = data as Record<string, unknown>;
  if (msg.type !== 'remote.command') return null;
  if (typeof msg.from !== 'string' || msg.from === '') return null;
  if (!isRemoteCommandName(msg.command)) return null;
  const event: RemoteCommandEvent = {
    type: 'remote.command',
    from: msg.from,
    command: msg.command,
  };
  if (msg.value !== undefined) event.value = msg.value;
  if (typeof msg.to === 'string') event.to = msg.to;
  return event;
}

/** The measured latency (ms) of an `UPDATE_PROFILE` command, or undefined. */
export function profileLatencyOf(event: RemoteCommandEvent): number | undefined {
  const value = event.value as { latency?: unknown } | undefined;
  return typeof value?.latency === 'number' && Number.isFinite(value.latency)
    ? value.latency
    : undefined;
}

/** The join mode of a `session.join_mode` command ('spectator' or anything else = singer). */
export const joinModeOf = (event: RemoteCommandEvent): string | undefined => {
  const mode = (event.value as { mode?: unknown } | undefined)?.mode;
  return typeof mode === 'string' ? mode : undefined;
};

/** Phone side value for a command's extra fields; `undefined` when there are none. */
export const commandValue = (data: Record<string, unknown>): Record<string, unknown> | undefined =>
  Object.keys(data).length > 0 ? data : undefined;

export interface RemoteCommandHostDeps {
  /** Hands a command to the TV window, or runs it on the host when no TV is connected. */
  forward: (command: RemoteCommandName, value: unknown) => void;
  playCalibrationBeep: () => void;
  /** Publishes a reply on the room channel. */
  send: (event: RemoteCommandEvent) => void;
  now: () => number;
  /** The host's own id; its own events are ignored. */
  selfId: string;
}

/**
 * Host handler for one room event. `PING` is answered with a `PONG` addressed to the sender, a
 * calibration beep plays locally, every other command is forwarded. Replies (`PONG`, anything
 * with `to`) and the host's own events are ignored.
 */
export function handleRemoteCommandEvent(data: unknown, deps: RemoteCommandHostDeps): void {
  const event = parseRemoteCommand(data);
  if (!event || event.from === deps.selfId || event.to !== undefined) return;
  switch (event.command) {
    case 'PONG':
      return;
    case 'PING':
      deps.send({
        type: 'remote.command',
        from: deps.selfId,
        to: event.from,
        command: 'PONG',
        value: deps.now(),
      });
      return;
    case 'CALIBRATE_BEEP':
      deps.playCalibrationBeep();
      return;
    default:
      deps.forward(event.command, event.value);
  }
}
