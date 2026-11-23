import { useEffect, useRef } from 'react';
import { useRoomEvents } from '../../../modules/room-game/useRoomEvents';
import { getRoleForDevice } from '../components/useStoredRoles';
import { handleHostSettingsEvent, type HostSettingsEvent } from '../logic/hostSettingsRpc';
import type { HostSettings } from '../types';
import { useMelodiqSettings } from './SettingsContext';
import { MELODIQ_GAME_KEY, useMelodiqRoomTransport } from './useMelodiqRoomTransport';

/**
 * Host side of remote host settings: answers `settings.get` / `settings.set` room events from
 * admin phones. The role comes from the transport-stamped `from` only (never from the payload).
 */
export function useHostSettingsRpc(): void {
  const room = useMelodiqRoomTransport();
  const { settings, updateSetting } = useMelodiqSettings();
  const settingsRef = useRef(settings);
  const updateRef = useRef(updateSetting);
  useEffect(() => {
    settingsRef.current = settings;
    updateRef.current = updateSetting;
  });

  useRoomEvents<HostSettingsEvent>({
    gameKey: MELODIQ_GAME_KEY,
    roomId: room?.roomId ?? '',
    transport: room?.transport,
    enabled: !!room,
    onEvent: (event, send) => {
      handleHostSettingsEvent(event, {
        getRole: getRoleForDevice,
        getSettings: () => settingsRef.current,
        apply: (patch) => {
          for (const [key, value] of Object.entries(patch)) {
            updateRef.current(key as keyof HostSettings, value as never);
          }
        },
        send,
        selfId: room?.selfId ?? '',
        onDenied: (rpc, role) =>
          console.warn(`[HostSettingsRpc] Denied ${rpc.type} from ${rpc.from} (Role: ${role})`),
      });
    },
  });
}
