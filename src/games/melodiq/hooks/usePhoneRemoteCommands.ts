import { useCallback } from 'react';
import { useRoomEvents } from '../../../modules/room-game/useRoomEvents';
import {
  commandValue,
  type RemoteCommandEvent,
  type RemoteCommandName,
} from '../logic/remoteCommands';
import { MELODIQ_GAME_KEY, type MelodiqRoomTransport } from './useMelodiqRoomTransport';

/**
 * Phone side of the remote: `sendCommand(command, data)` publishes a `remote.command` room event
 * to the host. Does nothing while not connected (`room` null). The phone consumes no replies
 * today (nothing sends `PING`), so it does not subscribe.
 */
export function usePhoneRemoteCommands(room: MelodiqRoomTransport | null) {
  const { send } = useRoomEvents<RemoteCommandEvent>({
    gameKey: MELODIQ_GAME_KEY,
    roomId: room?.roomId ?? '',
    transport: room?.transport,
    enabled: false,
    onEvent: () => {},
  });
  const selfId = room?.selfId ?? '';
  return useCallback(
    (command: RemoteCommandName, data: Record<string, unknown> = {}) => {
      if (!selfId) return;
      send({ type: 'remote.command', from: selfId, command, value: commandValue(data) });
    },
    [send, selfId],
  );
}
