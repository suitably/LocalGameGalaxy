import React, { useEffect } from 'react';
import { storage } from '../../../lib/storage';
import { useWebRTC } from '../audio/WebRTCContext';
import { useHostLibrarySearch } from '../hooks/useHostLibrarySearch';
import { useHostQueueRoom } from '../hooks/useHostQueueRoom';

/** Host side for phones: queue room, library search and the direct `helper_config.get` reply. */
export const PhoneQueueBridge: React.FC = () => {
  const { manager } = useWebRTC();
  useHostQueueRoom();
  useHostLibrarySearch();

  // Listen for commands
  useEffect(() => {
    if (!manager) return;

    const handleMessage = (peerId: string, data: unknown) => {
      if ((data as { type?: unknown } | null)?.type !== 'helper_config.get') return;
      // Direct reply (not a room event, #813): the helper URL lets the phone load
      // songs through the WebRTC proxy; it is the trigger for the phone's useSongs.
      const helperUrl = storage.getHelperUrl();
      if (!helperUrl) return;
      manager.sendToPeer(peerId, {
        type: 'helper_config',
        url: helperUrl,
        token: storage.getHelperToken(),
      });
    };

    manager.on('message', handleMessage);

    return () => {
      manager.off('message', handleMessage);
    };
  }, [manager]);

  return null;
};
