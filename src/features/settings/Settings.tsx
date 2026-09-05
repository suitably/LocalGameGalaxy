import React, { lazy, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../../context/TitleContext';
import { GeneralSettings } from './components/GeneralSettings';
import type { MelodiqSubTab } from './components/MelodiqSettingsCategory';

const NotificationSettingsCategory = lazy(() => import('./components/NotificationSettingsCategory').then(m => ({ default: m.NotificationSettingsCategory })));
const MelodiqSettingsCategory = lazy(() => import('./components/MelodiqSettingsCategory').then(m => ({ default: m.MelodiqSettingsCategory })));

interface SettingsProps {
    activeGameId?: string;
    onBack?: () => void;
    onNavigateToPlaylists?: () => void;
}

type TabType = 'melodiq' | 'general' | 'notifications';

export const Settings: React.FC<SettingsProps> = ({ onNavigateToPlaylists }) => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();

    // Set page title for GlobalHeader / Layout
    usePageTitle(t('settings.title', 'Settings'));

    // Determine active tab from URL (melodiq is ALWAYS default!)
    const tabParam = searchParams.get('tab') || '';
    const subParam = searchParams.get('sub') || '';

    const activeTab: TabType = (tabParam === 'general')
        ? 'general'
        : (tabParam === 'notifications' || tabParam === 'push' || tabParam === 'ntfy')
            ? 'notifications'
            : 'melodiq'; // Default is melodiq!

    const melodiqSubTab: MelodiqSubTab = (subParam as MelodiqSubTab) || 'all';

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
