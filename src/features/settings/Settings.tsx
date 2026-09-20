import React, { lazy, Suspense, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useLocation } from 'react-router-dom';
import { usePageTitle } from '../../context/TitleContext';
import { useHeaderLayout } from '../../context/HeaderLayoutContext';
import { GeneralSettings } from './components/GeneralSettings';
import type { MelodiqSubTab } from './components/MelodiqSettingsCategory';
import { resolveSettingsNav } from './settingsNav';

const NotificationSettingsCategory = lazy(() => import('./components/NotificationSettingsCategory').then(m => ({ default: m.NotificationSettingsCategory })));
const ServerSettingsCategory = lazy(() => import('./components/ServerSettingsCategory').then(m => ({ default: m.ServerSettingsCategory })));
const MelodiqSettingsCategory = lazy(() => import('./components/MelodiqSettingsCategory').then(m => ({ default: m.MelodiqSettingsCategory })));

interface SettingsProps {
    activeGameId?: string;
    activeSub?: string;
    onBack?: () => void;
    onNavigateToPlaylists?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ activeGameId, activeSub: propSub, onBack, onNavigateToPlaylists }) => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const { setHomeAction } = useHeaderLayout();

    const [eventSub, setEventSub] = React.useState<string | null>(null);
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<string>).detail;
            if (typeof detail === 'string') {
                setEventSub(detail);
            }
        };
        window.addEventListener('melodiq_subtab_change', handler);
        return () => window.removeEventListener('melodiq_subtab_change', handler);
    }, []);

    // Set page title for GlobalHeader / Layout
    usePageTitle(t('settings.title', 'Settings'));

    // Register onBack handler for GlobalHeader when rendered embedded with custom back action
    useEffect(() => {
        if (onBack) {
            setHomeAction(onBack);
            return () => {
                setHomeAction(null);
            };
        }
    }, [onBack, setHomeAction]);

    // Determine active tab & sub-level navigation:
    // Melodiq is default ONLY when coming from Melodiq; otherwise Allgemein (general) is default.
    const { activeTab, activeSub: navSub, activeSection } = resolveSettingsNav(
        searchParams,
        location.state,
        activeGameId
    );

    const effectiveSub = propSub || eventSub || navSub;
    const melodiqSubTab: MelodiqSubTab = (['all', 'server', 'microphones', 'profiles', 'gameplay', 'playlists'].includes(effectiveSub))
        ? (effectiveSub as MelodiqSubTab)
        : 'all';

    // Deep-linking scroll: If a specific sub or sub-sub section was targeted, scroll smoothly to it
    useEffect(() => {
        const targetId = activeSection
            ? `settings-section-${activeSection}`
            : (effectiveSub && effectiveSub !== 'all')
                ? `settings-section-${effectiveSub}`
                : null;

        if (targetId) {
            const timer = setTimeout(() => {
                const el = document.getElementById(targetId);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 120);
            return () => clearTimeout(timer);
        }
    }, [activeTab, effectiveSub, activeSection]);

    const isMissingUsdbParam = searchParams.get('missing_usdb') === '1';

    return (
        <Box sx={{ width: '100%', maxWidth: 'lg', mx: 'auto', mt: { xs: 1, sm: 2 }, pb: 6 }}>
            {/* Content Area - Navigation is handled directly in GlobalHeader (SettingsHeaderToolbar & SettingsHeaderSubNav) */}
            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'server' && (
                <Suspense fallback={<Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}>
                    <ServerSettingsCategory
                        autoFocusUsdb={isMissingUsdbParam}
                        onBackToGame={onBack}
                    />
                </Suspense>
            )}
            {activeTab === 'notifications' && (
                <Suspense fallback={<Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}>
                    <NotificationSettingsCategory />
                </Suspense>
            )}
            {activeTab === 'melodiq' && (
                <Suspense fallback={<Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}>
                    <MelodiqSettingsCategory 
                        key={melodiqSubTab}
                        activeSubTab={melodiqSubTab}
                        onNavigateToPlaylists={onNavigateToPlaylists}
                        autoFocusUsdb={isMissingUsdbParam}
                        onBackToGame={onBack}
                    />
                </Suspense>
            )}
        </Box>
    );
};
