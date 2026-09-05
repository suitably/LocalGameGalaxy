import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../../context/LayoutContext';

import SettingsIcon from '@mui/icons-material/Settings';
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
    const navigate = useNavigate();
    const { setHeader, setCustomHeaderActions } = useLayout();

    useEffect(() => {
        // Return to Hub when on Home, otherwise return to Melodiq Home
        const homeAction = currentView === 'Home' ? null : () => setCurrentView('Home');

        if (currentView === 'Home') {
            const headerActions: any[] = [];

            headerActions.push({
                label: 'Settings',
                icon: <SettingsIcon />,
                action: () => navigate('/settings?game=melodiq'),
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
        } else if (currentView === 'Settings') {
            // Settings manages its own header title and back navigation
            return;
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
