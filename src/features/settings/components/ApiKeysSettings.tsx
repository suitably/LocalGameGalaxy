import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Paper } from '@mui/material';
import KeyIcon from '@mui/icons-material/Key';
import GitHubIcon from '@mui/icons-material/GitHub';
import { useTranslation } from 'react-i18next';
import { ServerAdminPanel } from '../../../components/connection/ServerAdminPanel';
import { GitHubSettings } from './GitHubSettings';

type KeysSubTab = 'server_keys' | 'github';

export const ApiKeysSettings: React.FC = () => {
    const { t } = useTranslation();
    const [subTab, setSubTab] = useState<KeysSubTab>('server_keys');

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header / Intro */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <KeyIcon color="primary" sx={{ fontSize: 32 }} />
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {t('settings.api_keys_category_title', 'API-Keys & Integrationen')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('settings.api_keys_category_desc', 'Verwalte Client-Zugriffsschlüssel für Mitspieler und Freunde auf deinem Server sowie Token für externe Dienste.')}
                    </Typography>
                </Box>
            </Box>

            {/* Sub-Tabs Navigation */}
            <Paper sx={{ p: 0.5, borderRadius: 2.5, bgcolor: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <Tabs
                    value={subTab}
                    onChange={(_, val) => setSubTab(val)}
                    variant="scrollable"
                    scrollButtons="auto"
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{
                        minHeight: 42,
                        '& .MuiTab-root': {
                            minHeight: 42,
                            py: 1,
                            px: 2.5,
                            textTransform: 'none',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            borderRadius: 2,
                            gap: 1,
                            color: 'text.secondary',
                            '&.Mui-selected': {
                                color: 'primary.main',
                                bgcolor: 'rgba(100, 180, 255, 0.1)',
                            },
                        },
                    }}
                >
                    <Tab 
                        icon={<KeyIcon fontSize="small" />} 
                        iconPosition="start" 
                        label="Server API-Schlüssel für Freunde" 
                        value="server_keys" 
                    />
                    <Tab 
                        icon={<GitHubIcon fontSize="small" />} 
                        iconPosition="start" 
                        label="GitHub Integration Token" 
                        value="github" 
                    />
                </Tabs>
            </Paper>

            {/* Sub-Tab Content */}
            {subTab === 'server_keys' && <ServerAdminPanel />}
            {subTab === 'github' && <GitHubSettings />}
        </Box>
    );
};
