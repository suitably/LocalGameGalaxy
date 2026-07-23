import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLayout } from '../../../context/LayoutContext';

import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import QrCodeIcon from '@mui/icons-material/QrCode';

import { TVModeButton } from '../components/TVModeButton';

interface UseMelodiqHeaderProps {
    currentView: string;
    setCurrentView: (view: any) => void;
    loadingProgress: number | null;
    refreshSongs: () => Promise<void>;
    isClient: boolean;
    isTVConnected: boolean;
    isPresentationAvailable: boolean;
    openTVWindow: () => void;
    startPresentation: () => void;
    disconnectTV: () => void;
    clientRole: string;
}

export const useMelodiqHeader = ({
    currentView, setCurrentView, loadingProgress,
    refreshSongs, isClient,
    isTVConnected, isPresentationAvailable, openTVWindow, startPresentation, disconnectTV, clientRole
}: UseMelodiqHeaderProps) => {
    const { t } = useTranslation();
    const { setHeader, setCustomHeaderActions } = useLayout();

    useEffect(() => {
        // Always intercept home button to keep user in Melodiq
        const homeAction = () => setCurrentView('Home');

        if (currentView === 'Home') {
            const headerActions: any[] = [];

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
        currentView, loadingProgress, refreshSongs, setCurrentView, t, 
        setHeader, setCustomHeaderActions, isTVConnected, openTVWindow, 
        isPresentationAvailable, startPresentation, disconnectTV, isClient,
        clientRole
    ]);
};
