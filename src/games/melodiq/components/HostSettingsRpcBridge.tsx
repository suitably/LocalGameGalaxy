import { useHostSettingsRpc } from '../hooks/useHostSettingsRpc';

/** Mounts the host side of remote host settings for admin phones (renders nothing). */
export const HostSettingsRpcBridge: React.FC = () => {
  useHostSettingsRpc();
  return null;
};
