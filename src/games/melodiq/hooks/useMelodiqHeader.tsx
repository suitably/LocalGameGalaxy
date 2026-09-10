import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLayout } from '../../../context/LayoutContext';

import SettingsIcon from '@mui/icons-material/Settings';
import QrCodeIcon from '@mui/icons-material/QrCode';

import { type LoadingProgress } from './useSongs';
import { TVModeButton } from '../components/TVModeButton';

interface UseMelodiqHeaderProps {
    currentView: string;
    setCurrentView: (view: string) => void;
    loadingProgress: LoadingProgress | null;
    refreshSongs: () => Promise<void>;
    isClient: boolean;
    isTVConnected: boolean;
    isPresentationAvailable: boolean;
    openTVWindow: () => void;
    startPresentation: () => void;
    disconnectTV: () => void;
    clientRole: string;
    onBackToHome?: () => void;
}

export const useMelodiqHeader = ({
    currentView, setCurrentView, loadingProgress,
    refreshSongs, isClient,
    isTVConnected, isPresentationAvailable, openTVWindow, startPresentation, disconnectTV, clientRole,
    onBackToHome
}: UseMelodiqHeaderProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { setHeader, setCustomHeaderActions } = useLayout();

    useEffect(() => {
        // Return to Hub when on Home, otherwise return to Melodiq Home
        const homeAction = currentView === 'Home'
            ? null
            : (onBackToHome || (() => setCurrentView('Home')));

        if (currentView === 'Home') {
            const headerActions: MenuItem[] = [];

            headerActions.push({
                label: isClient ? t('melodiq.client_settings', 'Spieler-Profil') : t('settings.title', 'Einstellungen'),
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

            setHeader(t('melodiq.title'), headerActions, homeAction, null, false, isClient);
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
            if (isClient) {
                setHeader(t('melodiq.client_settings', 'Spieler-Profil'), [], homeAction, null, false, isClient);
                setCustomHeaderActions(null);
            } else {
                // Host in Melodiq settings:
                // Keep WebRTCProvider alive! Enable settings mode on GlobalHeader.
                setHeader(t('settings.title', 'Einstellungen'), [], homeAction, null, true, false);
                setCustomHeaderActions(null);
            }
        } else {
            // Clear menu items for other views to avoid irrelevant actions
            setHeader(t('melodiq.title'), [], homeAction, null, false, isClient);
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
        clientRole, location.pathname, location.search, navigate, onBackToHome
    ]);
};
