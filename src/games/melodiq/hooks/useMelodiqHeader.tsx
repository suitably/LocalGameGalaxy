import { useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLayout, type MenuItem } from '../../../context/LayoutContext';

import QueueMusicIcon from '@mui/icons-material/QueueMusicRounded';
import QrCodeIcon from '@mui/icons-material/QrCodeRounded';
import FolderOpenIcon from '@mui/icons-material/FolderOpenRounded';

import { type LoadingProgress } from './useSongs';
import TuneIcon from '@mui/icons-material/TuneRounded';
import { useClientEngine } from '../PhoneClientEngine';
import { canEditHostSettings } from '../logic/hostSettingsRpc';
import { TVModeButton } from '../components/TVModeButton';

interface UseMelodiqHeaderProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  loadingProgress?: LoadingProgress | null;
  refreshSongs?: () => Promise<void>;
  isClient: boolean;
  isTVConnected: boolean;
  isPresentationAvailable: boolean;
  openTVWindow: () => void;
  startPresentation: () => void;
  disconnectTV: () => void;
  clientRole: string;
  onBackToHome?: () => void;
  onOpenLocalFolder?: () => void;
}

export const useMelodiqHeader = ({
  currentView,
  setCurrentView,
  isClient,
  isTVConnected,
  isPresentationAvailable,
  openTVWindow,
  startPresentation,
  disconnectTV,
  clientRole,
  onBackToHome,
  onOpenLocalFolder,
}: UseMelodiqHeaderProps) => {
  const { setHostSettingsOpen } = useClientEngine();
  const { t } = useTranslation();
  const { setHeader, setCustomHeaderActions } = useLayout();

  const callbacksRef = useRef({
    setCurrentView,
    onBackToHome,
    openTVWindow,
    startPresentation,
    disconnectTV,
    onOpenLocalFolder,
  });
  useEffect(() => {
    callbacksRef.current = {
      setCurrentView,
      onBackToHome,
      openTVWindow,
      startPresentation,
      disconnectTV,
      onOpenLocalFolder,
    };
  });

  const handleHomeAction = useCallback(() => {
    if (callbacksRef.current.onBackToHome) {
      callbacksRef.current.onBackToHome();
    } else {
      callbacksRef.current.setCurrentView('Home');
    }
  }, []);

  const tvModeActions = useMemo(() => {
    if (isClient) return null;
    return (
      <TVModeButton
        isTVConnected={isTVConnected}
        isPresentationAvailable={isPresentationAvailable}
        onOpenTV={() => callbacksRef.current.openTVWindow()}
        onStartPresentation={() => callbacksRef.current.startPresentation()}
        onDisconnect={() => callbacksRef.current.disconnectTV()}
      />
    );
  }, [isClient, isTVConnected, isPresentationAvailable]);

  // Unmount cleanup only
  useEffect(() => {
    return () => {
      setHeader(null, [], null);
      setCustomHeaderActions(null);
    };
  }, [setHeader, setCustomHeaderActions]);

  useEffect(() => {
    const homeAction = currentView === 'Home' ? null : handleHomeAction;

    if (currentView === 'Home') {
      const headerActions: MenuItem[] = [];

      if (isClient && canEditHostSettings(clientRole)) {
        headerActions.push({
          label: t('melodiq.remote_host.title', 'Host settings'),
          icon: <TuneIcon />,
          action: () => setHostSettingsOpen(true),
          showAlways: true,
        });
      }

      if (!isClient) {
        headerActions.push({
          label: t('melodiq.manage_playlists', 'Manage Playlists'),
          icon: <QueueMusicIcon />,
          action: () => callbacksRef.current.setCurrentView('Playlists'),
          showAlways: false,
        });
        headerActions.push({
          label: 'Connect Phones',
          icon: <QrCodeIcon />,
          action: () => callbacksRef.current.setCurrentView('Connection'),
          showAlways: true,
        });

        if (callbacksRef.current.onOpenLocalFolder) {
          headerActions.push({
            label: t('melodiq.local_folder', 'Lokaler Song-Ordner'),
            icon: <FolderOpenIcon />,
            action: () => callbacksRef.current.onOpenLocalFolder?.(),
            showAlways: false,
          });
        }
      }

      setHeader(t('melodiq.title'), headerActions, homeAction, null, false, isClient);
      setCustomHeaderActions(tvModeActions);
    } else {
      setHeader(t('melodiq.title'), [], homeAction, null, false, isClient);
      setCustomHeaderActions(null);
    }
  }, [
    currentView,
    isClient,
    clientRole,
    setHostSettingsOpen,
    t,
    setHeader,
    setCustomHeaderActions,
    tvModeActions,
    handleHomeAction,
  ]);
};
