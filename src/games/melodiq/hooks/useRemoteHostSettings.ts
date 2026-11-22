import { useCallback, useEffect, useState } from 'react';
import { useRoomEvents } from '../../../modules/room-game/useRoomEvents';
import type { RoomTransport } from '../../../modules/room-game/roomTransport';
import { parseHostSettingsState, type HostSettingsEvent } from '../logic/hostSettingsRpc';
import type { HostSettings } from '../types';
import { MELODIQ_GAME_KEY, type MelodiqRoomTransport } from './useMelodiqRoomTransport';

/**
 * Phone side of remote host settings: sends `settings.get` whenever `open` turns on (or the
 * connection changes while open) and `settings.set` on `set`; keeps the host's last
 * `settings.state` addressed to this phone. `settings` is null until the host answered.
 */
export function useRemoteHostSettings(
  room: MelodiqRoomTransport | null,
  open: boolean,
): { settings: HostSettings | null; set: (patch: Partial<HostSettings>) => void } {
  // Values belong to the transport they arrived on, so a reconnect starts from "loading".
  const [state, setState] = useState<{ owner: RoomTransport; settings: HostSettings } | null>(null);
  const selfId = room?.selfId;
  const { send } = useRoomEvents<HostSettingsEvent>({
    gameKey: MELODIQ_GAME_KEY,
    roomId: room?.roomId ?? '',
    transport: room?.transport,
    enabled: !!room,
    onEvent: (event) => {
      const reply = parseHostSettingsState(event);
      if (!reply || !room || reply.to !== selfId) return;
      setState({ owner: room.transport, settings: reply.settings });
    },
  });

  useEffect(() => {
    if (open && selfId) send({ type: 'settings.get', from: selfId });
  }, [open, selfId, send]);

  const set = useCallback(
    (patch: Partial<HostSettings>) => {
      if (selfId) send({ type: 'settings.set', from: selfId, patch });
    },
    [selfId, send],
  );

  const settings = state && state.owner === room?.transport ? state.settings : null;
  return { settings, set };
}
