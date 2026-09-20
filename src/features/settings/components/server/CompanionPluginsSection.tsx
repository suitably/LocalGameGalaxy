import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Chip } from '@mui/material';
import ExtensionIcon from '@mui/icons-material/Extension';
import { useTranslation } from 'react-i18next';
import { getCompanionPlugins } from './companionRegistry';

interface CompanionPluginsSectionProps {
    autoFocusUsdb?: boolean;
    onBackToGame?: () => void;
}

export const CompanionPluginsSection: React.FC<CompanionPluginsSectionProps> = ({
    autoFocusUsdb,
    onBackToGame,
}) => {
    const { t } = useTranslation();
    const plugins = getCompanionPlugins();
    const [selectedPluginId, setSelectedPluginId] = useState<string>(plugins[0]?.id || 'melodiq');

    const currentPlugin = plugins.find(p => p.id === selectedPluginId) || plugins[0];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <ExtensionIcon color="primary" sx={{ fontSize: 30 }} />
                <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                        {t('settings.companion_plugins_title', 'Game Companion Services (Plugins)')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('settings.companion_plugins_desc', 'Optionale Server-Container für spieleigene Features wie KI-Audio, Asset-Streaming und Playlists.')}
                    </Typography>
                </Box>
            </Box>

            {/* Plugin Selector Tabs */}
            <Tabs
                value={selectedPluginId}
                onChange={(_, val) => setSelectedPluginId(val)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 2,
                    p: 0.5,
                    minHeight: 44,
                    '& .MuiTab-root': {
                        textTransform: 'none',
                        fontWeight: 600,
                        minHeight: 40,
                        borderRadius: 1.5,
                        px: 2,
                        gap: 1,
                    },
                }}
            >
                {plugins.map((plugin) => (
                    <Tab
                        key={plugin.id}
                        value={plugin.id}
                        iconPosition="start"
                        icon={plugin.icon as React.ReactElement}
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span>{plugin.name}</span>
                                {plugin.status === 'planned' && (
                                    <Chip label={t('common.planned', 'Geplant')} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                                )}
                            </Box>
                        }
                    />
                ))}
            </Tabs>

            {/* Active Companion Plugin Config */}
            {currentPlugin && (
                <Box sx={{ mt: 1 }}>
                    {currentPlugin.renderConfig({ autoFocusUsdb, onBackToGame })}
                </Box>
            )}
        </Box>
    );
};
