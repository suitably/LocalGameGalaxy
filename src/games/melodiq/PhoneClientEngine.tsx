import React, { useEffect, useState, createContext, useContext, useRef, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { useWebRTCClient } from '../../lib/webrtc';
import { storage, sessionStorageSafe, STORAGE_KEYS } from '../../lib/storage';
import { usePhoneClientMessages } from './hooks/usePhoneClientMessages';
import { RemoteHostSettingsModal } from './components/RemoteHostSettingsModal';
import type { HostSettings } from './types';
import { useFeedbackRelay } from './hooks/useFeedbackRelay';
import { usePhoneMicStreaming } from './hooks/usePhoneMicStreaming';
import { loadClientProfile, resolveTrackerUrls, type ClientProfile } from './logic/clientProfile';
import { parseGameUrlParams } from '../../modules/sharing';
import { isPartyRoomCode } from '../../features/party/logic/partyRoom';
import { universalPartyManager } from '../../features/party/logic/universalPartyManager';
import { getOrCreatePlayerName } from '../../features/party/logic/playerName';
import { useFollowPartyLobby } from '../../features/party/hooks/useFollowPartyLobby';
import { useWakeLock } from '../../hooks/useWakeLock';
import { publishClientEngine, useMountedClientEngine } from './hooks/clientEngineStore';

export type { ClientProfile } from './logic/clientProfile';

export interface ClientEngineContextType {
  isConnected: boolean;
  statusMessage: string;
  isSessionPlaying: boolean;
  activeSongId: string | null;
  sendClientCommand: (command: string, data?: Record<string, unknown>) => void;
  /** Sends a typed message to the host over the data channel. */
  sendClientData: (data: object) => void;
  clientProfile: ClientProfile;
  /** Host settings last reported by the host (admin phones only). */
  hostSettings: HostSettings | null;
  isHostSettingsOpen: boolean;
  setHostSettingsOpen: (open: boolean) => void;
  /** Permission role granted by the host (admin, queue manager, …; `roster.update`). */
  clientRole: string;
  setClientRole: (role: string) => void;
  /** The host scores this phone in the running song, so its microphone streams pitch. */
  isSinging: boolean;
  setSinging: (singing: boolean) => void;
  promptedSongId: string | null;
  setPromptedSongId: (id: string | null) => void;
  updateClientProfile: (updates: Partial<ClientProfile>) => void;
}

const DEFAULT_CLIENT_ENGINE: ClientEngineContextType = {
  isConnected: false,
  statusMessage: 'Not connected',
  isSessionPlaying: false,
  activeSongId: null,
  sendClientCommand: () => {},
  sendClientData: () => {},
  clientProfile: { name: 'Phone', hue: 120, deviceId: '' },
  hostSettings: null,
  isHostSettingsOpen: false,
  setHostSettingsOpen: () => {},
  clientRole: 'spectator',
  setClientRole: () => {},
  isSinging: false,
  setSinging: () => {},
  promptedSongId: null,
  setPromptedSongId: () => {},
  updateClientProfile: () => {},
};

const ClientEngineContext = createContext<ClientEngineContextType | null>(null);

/** The phone engine: from the React tree, else the mounted one (settings sheet), else defaults. */
export const useClientEngine = (): ClientEngineContextType => {
  const fromTree = useContext(ClientEngineContext);
  const mounted = useMountedClientEngine();
  return fromTree ?? mounted ?? DEFAULT_CLIENT_ENGINE;
};

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
  const partyId = parseGameUrlParams().get('party');
  useFollowPartyLobby(partyId, isPartyRoomCode(partyId));
  const [trackerUrls] = useState<string[]>(() => resolveTrackerUrls(window.location.search));
  const [clientProfile, setClientProfile] = useState<ClientProfile>(() =>
    // joined through the lobby: the party's name and device id, no separate profile
    loadClientProfile(
      isPartyRoomCode(partyId)
        ? { id: universalPartyManager.getMyPlayerId(), name: getOrCreatePlayerName() }
        : null,
    ),
  );
  const [clientRole, setClientRole] = useState<string>('spectator');
  const [isSinging, setSinging] = useState(false);
  const [promptedSongId, setPromptedSongId] = useState<string | null>(null);
  const [isHostSettingsOpen, setHostSettingsOpen] = useState(false);

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

  const { handleMessage, isSessionPlaying, activeSongId, hostSettings } = usePhoneClientMessages({
    getDeviceId,
    setClientRole,
    setSinging,
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

  // Route feedback through the host (its PAT) while connected
  useFeedbackRelay(isConnected, sendData);

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
    isSinging,
    micDeviceId: clientProfile.micDeviceId,
    sendData,
  });
  // A locked screen suspends the browser and with it the microphone and the connection.
  useWakeLock(isConnected && isSessionPlaying && isSinging);

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

  const value: ClientEngineContextType = {
    isConnected,
    statusMessage,
    isSessionPlaying,
    activeSongId,
    sendClientCommand,
    sendClientData: sendData,
    clientProfile,
    hostSettings,
    isHostSettingsOpen,
    setHostSettingsOpen,
    updateClientProfile,
    clientRole,
    setClientRole,
    isSinging,
    setSinging,
    promptedSongId,
    setPromptedSongId,
  };
  useEffect(() => publishClientEngine(value));
  useEffect(() => () => publishClientEngine(null), []);

  return (
    <ClientEngineContext.Provider value={value}>
      {!isConnected && <ConnectionOverlay message={statusMessage} />}
      {children}
      {clientRole === 'admin' && <RemoteHostSettingsModal />}
    </ClientEngineContext.Provider>
  );
};
