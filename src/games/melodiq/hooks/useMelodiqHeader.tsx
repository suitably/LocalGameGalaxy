import { useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLayout, type MenuItem } from '../../../context/LayoutContext';

import SettingsIcon from '@mui/icons-material/Settings';
import QrCodeIcon from '@mui/icons-material/QrCode';

import { type LoadingProgress } from './useSongs';
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
}

export const useMelodiqHeader = ({
    currentView, setCurrentView,
    isClient, isTVConnected, isPresentationAvailable,
    openTVWindow, startPresentation, disconnectTV,
    onBackToHome
}: UseMelodiqHeaderProps) => {
    const { t } = useTranslation();
    const { setHeader, setCustomHeaderActions } = useLayout();

    const callbacksRef = useRef({ setCurrentView, onBackToHome, openTVWindow, startPresentation, disconnectTV });
    useEffect(() => {
        callbacksRef.current = { setCurrentView, onBackToHome, openTVWindow, startPresentation, disconnectTV };
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
            const headerActions: MenuItem[] = [
                {
                    label: isClient ? t('melodiq.client_settings', 'Spieler-Profil') : t('settings.title', 'Einstellungen'),
                    icon: <SettingsIcon />,
                    action: () => callbacksRef.current.setCurrentView('Settings'),
                    showAlways: true
                }
            ];

            if (!isClient) {
                headerActions.push({
                    label: 'Connect Phones',
                    icon: <QrCodeIcon />,
                    action: () => callbacksRef.current.setCurrentView('Connection'),
                    showAlways: true
                });
            }

            setHeader(t('melodiq.title'), headerActions, homeAction, null, false, isClient);
            setCustomHeaderActions(tvModeActions);
        } else if (currentView === 'Settings') {
            if (isClient) {
                setHeader(t('melodiq.client_settings', 'Spieler-Profil'), [], homeAction, null, false, isClient);
            } else {
                setHeader(t('settings.title', 'Einstellungen'), [], homeAction, null, true, false);
            }
            setCustomHeaderActions(null);
        } else {
            setHeader(t('melodiq.title'), [], homeAction, null, false, isClient);
            setCustomHeaderActions(null);
        }
    }, [currentView, isClient, t, setHeader, setCustomHeaderActions, tvModeActions, handleHomeAction]);
};
