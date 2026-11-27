import { useRoomEvents } from '../../../modules/room-game/useRoomEvents';
import { playCalibrationBeep } from '../../../modules/audio/latency';
import {
  handleRemoteCommandEvent,
  type RemoteCommandEvent,
  type RemoteCommandName,
} from '../logic/remoteCommands';
import { MELODIQ_GAME_KEY, useMelodiqRoomTransport } from './useMelodiqRoomTransport';

interface Options {
  /** False on a phone (no host manager): the host handler must not run there. */
  enabled: boolean;
}

/** Runs a phone command on the host (`useHostPlaybackCommands`). */
const forward = (command: RemoteCommandName, value: unknown) =>
  window.dispatchEvent(new CustomEvent('melodiq_host_command', { detail: { command, value } }));

/**
 * Host side of the phone remote: `remote.command` room events run on the host
 * (`melodiq_host_command`), also with a TV connected — the host runs the real session and the
 * queue, the TV window only renders it and ignores playback commands. `PING` is answered to the
 * sender only.
 */
export function useHostRemoteCommands({ enabled }: Options): void {
  const room = useMelodiqRoomTransport();

  useRoomEvents<RemoteCommandEvent>({
    gameKey: MELODIQ_GAME_KEY,
    roomId: room?.roomId ?? '',
    transport: room?.transport,
    enabled: enabled && !!room,
    onEvent: (event, send) =>
      handleRemoteCommandEvent(event, {
        forward,
        playCalibrationBeep,
        send,
        now: Date.now,
        selfId: room?.selfId ?? '',
      }),
  });
}
