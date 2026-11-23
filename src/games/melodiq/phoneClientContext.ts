import { createContext, useContext } from 'react';
import type { ClientProfile } from './logic/clientProfile';
import { useMountedClientEngine } from './hooks/clientEngineStore';

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

export const ClientEngineContext = createContext<ClientEngineContextType | null>(null);

/** The phone engine: from the React tree, else the mounted one (settings sheet), else defaults. */
export const useClientEngine = (): ClientEngineContextType => {
  const fromTree = useContext(ClientEngineContext);
  const mounted = useMountedClientEngine();
  return fromTree ?? mounted ?? DEFAULT_CLIENT_ENGINE;
};
