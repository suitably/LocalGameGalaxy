import { useEffect } from 'react';
import { storage } from '../../../lib/storage';

interface ConfigMessage {
  type?: string;
  config?: { url?: string; token?: string };
}

interface ConfigMessageSource {
  on(event: 'message', listener: (peerId: string, data: ConfigMessage) => void): unknown;
  off(event: 'message', listener: (peerId: string, data: ConfigMessage) => void): unknown;
}

/** Applies helper-server config pushed by a remote phone (not while a session is running). */
export function useRemoteConfigListener(
  manager: ConfigMessageSource | null,
  currentView: string,
  setFeedbackMessage: (msg: string | null) => void,
) {
  useEffect(() => {
    if (!manager) return;

    if (currentView !== 'Session') {
      const handleConfig = (peerId: string, data: ConfigMessage) => {
        if (data.type === 'configure' && data.config) {
          console.log(`[Host] Received Remote Config from ${peerId}:`, data.config);
          if (data.config.url) storage.setHelperUrl(data.config.url);
          if (data.config.token) storage.setHelperToken(data.config.token);
          storage.setHelperActive(true);
          setFeedbackMessage(
            `Configuration Updated by Remote Phone!\nURL: ${data.config.url}\nReloading...`,
          );
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      };
      manager.on('message', handleConfig);
      return () => {
        manager.off('message', handleConfig);
      };
    }
  }, [manager, currentView, setFeedbackMessage]);
}
