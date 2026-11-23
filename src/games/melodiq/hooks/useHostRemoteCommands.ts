import { useEffect, useRef } from 'react';
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
  isTVConnected: boolean;
  /** Sends a command to the TV window. */
  sendRemoteCommand: (command: string, value?: unknown) => void;
}

/**
 * Host side of the phone remote: `remote.command` room events go to the TV window, or run on the
 * host (`melodiq_host_command`) when no TV is connected; `PING` is answered to the sender only.
 */
export function useHostRemoteCommands({
  enabled,
  isTVConnected,
  sendRemoteCommand,
}: Options): void {
  const room = useMelodiqRoomTransport();
  const forwardRef = useRef<(command: RemoteCommandName, value: unknown) => void>(() => {});
  useEffect(() => {
    forwardRef.current = (command, value) => {
      if (isTVConnected) {
        sendRemoteCommand(command, value);
      } else {
        window.dispatchEvent(
          new CustomEvent('melodiq_host_command', { detail: { command, value } }),
        );
      }
    };
  });

  useRoomEvents<RemoteCommandEvent>({
    gameKey: MELODIQ_GAME_KEY,
    roomId: room?.roomId ?? '',
    transport: room?.transport,
    enabled: enabled && !!room,
    onEvent: (event, send) =>
      handleRemoteCommandEvent(event, {
        forward: (command, value) => forwardRef.current(command, value),
        playCalibrationBeep,
        send,
        now: Date.now,
        selfId: room?.selfId ?? '',
      }),
  });
}
