import React, { lazy, Suspense, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useLocation } from 'react-router-dom';
import { usePageTitle } from '../../context/TitleContext';
import { GeneralSettings } from './components/GeneralSettings';
import type { MelodiqSubTab } from './components/MelodiqSettingsCategory';
import { resolveSettingsNav } from './settingsNav';

const NotificationSettingsCategory = lazy(() => import('./components/NotificationSettingsCategory').then(m => ({ default: m.NotificationSettingsCategory })));
const MelodiqSettingsCategory = lazy(() => import('./components/MelodiqSettingsCategory').then(m => ({ default: m.MelodiqSettingsCategory })));

interface SettingsProps {
    activeGameId?: string;
    onBack?: () => void;
    onNavigateToPlaylists?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ activeGameId, onNavigateToPlaylists }) => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const location = useLocation();

    // Set page title for GlobalHeader / Layout
    usePageTitle(t('settings.title', 'Settings'));

    // Determine active tab & sub-level navigation:
    // Melodiq is default ONLY when coming from Melodiq; otherwise Allgemein (general) is default.
    const { activeTab, activeSub, activeSection } = resolveSettingsNav(
        searchParams,
        location.state,
        activeGameId
    );

    const melodiqSubTab: MelodiqSubTab = (['all', 'server', 'microphones', 'profiles', 'gameplay', 'playlists'].includes(activeSub))
        ? (activeSub as MelodiqSubTab)
        : 'all';

    // Deep-linking scroll: If a specific sub or sub-sub section was targeted, scroll smoothly to it
    useEffect(() => {
        const targetId = activeSection
            ? `settings-section-${activeSection}`
            : (activeSub && activeSub !== 'all')
                ? `settings-section-${activeSub}`
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
    }, [activeTab, activeSub, activeSection]);

    return (
        <Box sx={{ width: '100%', maxWidth: 'lg', mx: 'auto', mt: { xs: 1, sm: 2 }, pb: 6 }}>
            {/* Content Area - Navigation is handled directly in GlobalHeader (SettingsHeaderToolbar & SettingsHeaderSubNav) */}
            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'notifications' && (
                <Suspense fallback={<Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}>
                    <NotificationSettingsCategory />
                </Suspense>
            )}
            {activeTab === 'melodiq' && (
                <Suspense fallback={<Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}>
                    <MelodiqSettingsCategory 
                        activeSubTab={melodiqSubTab}
                        onNavigateToPlaylists={onNavigateToPlaylists} 
                    />
                </Suspense>
            )}
        </Box>
    );
};
