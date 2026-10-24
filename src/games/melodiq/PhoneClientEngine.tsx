import React, { useEffect, useState, createContext, useContext, useRef, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { useWebRTCClient } from '../../lib/webrtc';
import { storage, sessionStorageSafe, STORAGE_KEYS } from '../../lib/storage';
import { usePhoneClientMessages } from './hooks/usePhoneClientMessages';
import { usePhoneMicStreaming } from './hooks/usePhoneMicStreaming';
import { loadClientProfile, resolveTrackerUrls, type ClientProfile } from './logic/clientProfile';

export type { ClientProfile } from './logic/clientProfile';

interface ClientEngineContextType {
  isConnected: boolean;
  statusMessage: string;
  isSessionPlaying: boolean;
  activeSongId: string | null;
  sendClientCommand: (command: string, data?: Record<string, unknown>) => void;
  clientProfile: ClientProfile;
  clientRole: string;
  setClientRole: (role: string) => void;
  promptedSongId: string | null;
  setPromptedSongId: (id: string | null) => void;
  updateClientProfile: (updates: Partial<ClientProfile>) => void;
}

export const ClientEngineContext = createContext<ClientEngineContextType>({
  isConnected: false,
  statusMessage: 'Not connected',
  isSessionPlaying: false,
  activeSongId: null,
  sendClientCommand: () => {},
  clientProfile: { name: 'Phone', hue: 120, deviceId: '' },
  clientRole: 'spectator',
  setClientRole: () => {},
  promptedSongId: null,
  setPromptedSongId: () => {},
  updateClientProfile: () => {},
});

export const useClientEngine = () => useContext(ClientEngineContext);

/** Blocks the phone UI until the WebRTC link to the host is up. */
const ConnectionOverlay: React.FC<{ message: string }> = ({ message }) => (
  <Box
    sx={{
      position: 'fixed',
      inset: 0,
      bgcolor: 'background.default',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 2,
    }}
  >
    <Typography variant="h2" component="h2" sx={{ color: 'text.primary', textAlign: 'center' }}>
      {message}
    </Typography>
  </Box>
);

export const PhoneClientEngine: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const partyId = new URLSearchParams(window.location.search).get('party');
  const [trackerUrls] = useState<string[]>(() => resolveTrackerUrls(window.location.search));
  const [clientProfile, setClientProfile] = useState<ClientProfile>(loadClientProfile);
  const [clientRole, setClientRole] = useState<string>('spectator');
  const [promptedSongId, setPromptedSongId] = useState<string | null>(null);

  const updateClientProfile = useCallback((updates: Partial<ClientProfile>) => {
    setClientProfile((prev) => {
      const next = { ...prev, ...updates };
      storage.setJson(STORAGE_KEYS.CLIENT_PROFILE, next);
      window.dispatchEvent(new Event('melodiq_profile_update'));
      return next;
    });
  }, []);

  // Ref so stable callbacks always see the latest profile
  const clientProfileRef = useRef(clientProfile);
  useEffect(() => {
    clientProfileRef.current = clientProfile;
  }, [clientProfile]);

  const getDeviceId = useCallback(() => clientProfileRef.current.deviceId, []);
  const getIdentity = useCallback(
    () => ({
      name: clientProfileRef.current.name,
      hue: clientProfileRef.current.hue,
      deviceId: clientProfileRef.current.deviceId,
    }),
    [],
  );

  const { handleMessage, isSessionPlaying, activeSongId } = usePhoneClientMessages({
    getDeviceId,
    setClientRole,
    updateClientProfile,
  });

  const { isConnected, statusMessage, sendData, resendIdentity } = useWebRTCClient(
    partyId,
    trackerUrls,
    { autoConnect: true, onMessage: handleMessage, getIdentity },
  );

  // Signal connection state for melodiqFetch waitForConnection()
  useEffect(() => {
    const flag = window as unknown as { __melodiq_rtc_connected?: boolean };
    if (isConnected) {
      sessionStorageSafe.set(STORAGE_KEYS.MELODIQ_RTC_CONNECTED, 'true');
      flag.__melodiq_rtc_connected = true;
      window.dispatchEvent(new Event('melodiq_rtc_connected'));
    } else {
      sessionStorageSafe.remove(STORAGE_KEYS.MELODIQ_RTC_CONNECTED);
      flag.__melodiq_rtc_connected = false;
    }
  }, [isConnected]);

  // Request initial data on connect
  useEffect(() => {
    if (isConnected) {
      setTimeout(() => {
        sendData({ type: 'queue.get' });
      }, 500);
    }
  }, [isConnected, sendData]);

  // Forward events from UI components (like useQueue) to the host
  useEffect(() => {
    const handler = (e: Event) => {
      if (isConnected) {
        sendData((e as CustomEvent).detail);
      }
    };
    window.addEventListener('melodiq_client_send_data', handler);
    return () => window.removeEventListener('melodiq_client_send_data', handler);
  }, [isConnected, sendData]);

  usePhoneMicStreaming({
    isSessionPlaying,
    clientRole,
    micDeviceId: clientProfile.micDeviceId,
    sendData,
  });

  const sendClientCommand = (command: string, data: Record<string, unknown> = {}) => {
    sendData({ type: 'remote.command', command, ...data });
  };

  // Re-send identity if profile changes while connected
  useEffect(() => {
    if (isConnected && resendIdentity) {
      resendIdentity();
      sendClientCommand('UPDATE_PROFILE', { latency: clientProfile.latency || 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientProfile.name, clientProfile.hue, clientProfile.latency, isConnected, resendIdentity]);

  return (
    <ClientEngineContext.Provider
      value={{
        isConnected,
        statusMessage,
        isSessionPlaying,
        activeSongId,
        sendClientCommand,
        clientProfile,
        updateClientProfile,
        clientRole,
        setClientRole,
        promptedSongId,
        setPromptedSongId,
      }}
    >
      {!isConnected && <ConnectionOverlay message={statusMessage} />}
      {children}
    </ClientEngineContext.Provider>
  );
};
