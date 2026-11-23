/**
 * Melodiq's same-device BroadcastChannels, expressed as `useMultiChannelSync` options.
 * The shared hook names a channel `${broadcastPrefix}_${channelId}`; the parts below keep the
 * channel names on the wire unchanged (`melodiq_tv_control`, `melodiq_queue_channel`).
 * Melodiq's hooks pass `selfEcho: false`, so each hook instance behaves like the hand-held
 * BroadcastChannel it replaced: it never receives its own messages, but does receive those of
 * other instances in the same tab.
 */

/** Host ↔ TV window control channel (TV mode, settings, session end). */
export const TV_CONTROL_SYNC = { broadcastPrefix: 'melodiq_tv', channelId: 'control' } as const;

/** Host queue / now-playing sync between tabs of the host device. */
export const QUEUE_SYNC = { broadcastPrefix: 'melodiq_queue', channelId: 'channel' } as const;

/** A message on the TV control channel; the payload shape depends on `type`. */
export interface TvControlMessage<P = unknown> {
  type: string;
  payload?: P;
}
