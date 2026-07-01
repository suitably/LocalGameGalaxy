import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLayout } from '../../../context/LayoutContext';

import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import QrCodeIcon from '@mui/icons-material/QrCode';

import { TVModeButton } from '../components/TVModeButton';

interface UseMelodiqHeaderProps {
    currentView: string;
    setCurrentView: (view: any) => void;
    viewMode: 'list' | 'grid';
    setViewMode: (val: 'list' | 'grid' | ((prev: 'list' | 'grid') => 'list' | 'grid')) => void;
    queueLength: number;
    loadingProgress: number | null;
    refreshSongs: () => Promise<void>;
    setShowQueueDrawer: (show: boolean) => void;
    isClient: boolean;
    isTVConnected: boolean;
    isPresentationAvailable: boolean;
    openTVWindow: () => void;
    startPresentation: () => void;
    disconnectTV: () => void;
    clientRole: string;
}

export const useMelodiqHeader = ({
    currentView, setCurrentView, viewMode, setViewMode, queueLength, loadingProgress,
    refreshSongs, setShowQueueDrawer, isClient,
    isTVConnected, isPresentationAvailable, openTVWindow, startPresentation, disconnectTV, clientRole
}: UseMelodiqHeaderProps) => {
    const { t } = useTranslation();
    const { setHeader, setCustomHeaderActions } = useLayout();

    useEffect(() => {
        // Always intercept home button to keep user in Melodiq
        const homeAction = () => setCurrentView('Home');

        if (currentView === 'Home') {
            const headerActions: any[] = [
                {
                    label: viewMode === 'grid' ? 'List View' : 'Grid View',
                    icon: viewMode === 'grid' ? <ViewListIcon /> : <ViewModuleIcon />,
                    action: () => setViewMode(prev => prev === 'grid' ? 'list' : 'grid'),
                    showAlways: true
                }
            ];

            const isSinger = isClient && clientRole === 'singer';
            const isAdmin = !isClient || clientRole === 'admin';

            headerActions.push({
                label: `Queue (${queueLength})`,
                icon: <PlaylistPlayIcon />,
                action: () => setShowQueueDrawer(true)
            });

            if (isAdmin) {
                headerActions.push({
                    label: 'Playlists',
                    icon: <QueueMusicIcon />,
                    action: () => setCurrentView('Playlists')
                });
            }

            headerActions.push({
                label: 'Refresh',
                icon: <SearchIcon />,
                action: () => refreshSongs(),
                disabled: loadingProgress !== null
            });

            headerActions.push({
                label: 'Settings',
                icon: <SettingsIcon />,
                action: () => setCurrentView('Settings'),
                showAlways: true
            });

            if (!isClient) {
                headerActions.push({
                    label: 'Connect Phones',
                    icon: <QrCodeIcon />,
                    action: () => setCurrentView('Connection'),
                    showAlways: true
                });
            }

            setHeader(t('melodiq.title'), headerActions, homeAction);
            setCustomHeaderActions(
                !isClient ? (
                    <TVModeButton
                        isTVConnected={isTVConnected}
                        isPresentationAvailable={isPresentationAvailable}
                        onOpenTV={openTVWindow}
                        onStartPresentation={startPresentation}
                        onDisconnect={disconnectTV}
                    />
                ) : null
            );
        } else {
            // Clear menu items for other views to avoid irrelevant actions
            setHeader(t('melodiq.title'), [], homeAction);
            setCustomHeaderActions(null);
        }

        return () => {
            setHeader(null, [], null);
            setCustomHeaderActions(null);
        };
    }, [
        currentView, queueLength, loadingProgress, refreshSongs, setCurrentView, t, 
        setHeader, setCustomHeaderActions, isTVConnected, openTVWindow, 
        isPresentationAvailable, startPresentation, disconnectTV, viewMode, isClient,
        setViewMode, setShowQueueDrawer, clientRole
    ]);
};
