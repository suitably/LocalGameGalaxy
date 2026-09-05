import React, { useState } from 'react';
import {
    Box, Paper, Typography, Tabs, Tab, Button, IconButton,
    Tooltip, CircularProgress, Collapse, Divider,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import StorageIcon from '@mui/icons-material/Storage';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import TerminalIcon from '@mui/icons-material/Terminal';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useTranslation } from 'react-i18next';
import { useServerAutoDetect } from './setup/useServerAutoDetect';
import { SetupBinaryTab } from './setup/SetupBinaryTab';
import { SetupDockerTab } from './setup/SetupDockerTab';
import { SetupCloudflareTab } from './setup/SetupCloudflareTab';
import { SetupOneLinerTab } from './setup/SetupOneLinerTab';
import { settingsCardSx } from '../../features/settings/settingsStyles';

type WizardTab = 'binary' | 'docker' | 'cloudflare' | 'terminal';

export interface ServerSetupWizardProps {
    isDialog?: boolean;
}

export const ServerSetupWizard: React.FC<ServerSetupWizardProps> = ({ isDialog = false }) => {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(true);
    const [activeTab, setActiveTab] = useState<WizardTab>('binary');

    const {
        os,
        token,
        regenerateToken,
        scanStatus,
        songCount,
        checkLocalhost,
        autoConnect,
        downloadConfigFile,
        downloadDockerCompose,
    } = useServerAutoDetect();

    return (
        <Paper
            elevation={isDialog ? 0 : 1}
            sx={{
                ...(isDialog
                    ? { bgcolor: 'transparent', boxShadow: 'none', border: 'none', p: 0 }
                    : settingsCardSx),
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <AutoFixHighIcon color="primary" sx={{ fontSize: 32 }} />
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {t('server.setup.title', 'Automatic Server Setup')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {t('server.setup.subtitle', 'Wähle deine bevorzugte Methode, um deinen Melodiq Companion Server in Sekundenschnelle zu starten und zu verbinden.')}
                        </Typography>
                    </Box>
                </Box>
                <IconButton
                    onClick={() => setExpanded((v) => !v)}
                    size="small"
                    sx={{ color: 'text.secondary' }}
                    aria-label="toggle assistant"
                >
                    {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
            </Box>

            {/* Local Server Live Status Banner */}
            <Paper
                sx={{
                    p: 1.5,
                    mb: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1.5,
                    bgcolor:
                        scanStatus === 'found' || scanStatus === 'connected'
                            ? 'rgba(46, 125, 50, 0.15)'
                            : 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid',
                    borderColor:
                        scanStatus === 'found' || scanStatus === 'connected'
                            ? 'success.main'
                            : 'rgba(255, 255, 255, 0.08)',
                    borderRadius: 2,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {scanStatus === 'checking' && <CircularProgress size={20} />}
                    {(scanStatus === 'found' || scanStatus === 'connected') && <CheckCircleIcon color="success" />}
                    <Typography variant="body2" sx={{ fontWeight: scanStatus === 'found' ? 'bold' : 'normal' }}>
                        {scanStatus === 'checking' && t('server.setup.autodetect.status_checking', 'Scanning for local server (localhost:3000)...')}
                        {(scanStatus === 'found' || scanStatus === 'connected') &&
                            `${t('server.setup.autodetect.status_found', 'Local Server online & ready!')}${songCount !== null && songCount > 0 ? ` (${songCount} Songs)` : ''}`}
                        {scanStatus === 'not_found' && t('server.setup.autodetect.status_not_found', 'No local server found. Start the server and click Connect.')}
                        {scanStatus === 'idle' && t('server.setup.autodetect.status_not_found', 'No local server found. Start the server and click Connect.')}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={checkLocalhost}
                        disabled={scanStatus === 'checking'}
                        sx={{ borderRadius: 50, textTransform: 'none' }}
                    >
                        {t('server.setup.autodetect.rescan', 'Scan Again')}
                    </Button>

                    {(scanStatus === 'found' || scanStatus === 'connected') && (
                        <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={autoConnect}
                            sx={{ borderRadius: 50, textTransform: 'none', px: 2 }}
                        >
                            {scanStatus === 'connected'
                                ? t('server.setup.autodetect.connected_btn', 'Successfully Connected')
                                : t('server.setup.autodetect.connect_btn', 'Connect to Local Server Now')}
                        </Button>
                    )}
                </Box>
            </Paper>

            <Collapse in={expanded}>
                {/* Master Token Preview Bar */}
                <Box sx={{ mb: 2.5, p: 1.5, bgcolor: 'rgba(0, 0, 0, 0.3)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                            {t('server.setup.token_notice', 'Your Master Security Token:')}
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'primary.light', fontWeight: 'bold' }}>
                            {token}
                        </Typography>
                    </Box>
                    <Tooltip title={t('server.setup.token_regenerate', 'Generate New Token')}>
                        <IconButton size="small" onClick={regenerateToken} sx={{ color: 'text.secondary' }}>
                            <RefreshIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>

                {/* Tabs */}
                <Tabs
                    value={activeTab}
                    onChange={(_e, v) => setActiveTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{
                        mb: 2.5,
                        borderBottom: 1,
                        borderColor: 'divider',
                        '.MuiTab-root': { textTransform: 'none', fontWeight: 'bold', fontSize: '0.95rem' },
                    }}
                >
                    <Tab icon={<DesktopWindowsIcon fontSize="small" />} iconPosition="start" label={t('server.setup.tabs.binary', 'Desktop App / Binary')} value="binary" />
                    <Tab icon={<StorageIcon fontSize="small" />} iconPosition="start" label={t('server.setup.tabs.docker', 'Docker Compose')} value="docker" />
                    <Tab icon={<CloudQueueIcon fontSize="small" />} iconPosition="start" label={t('server.setup.tabs.cloudflare', 'Cloudflare 24/7')} value="cloudflare" />
                    <Tab icon={<TerminalIcon fontSize="small" />} iconPosition="start" label={t('server.setup.tabs.terminal', '1-Line Terminal')} value="terminal" />
                </Tabs>

                <Divider sx={{ mb: 2 }} />

                {/* Tab Contents */}
                {activeTab === 'binary' && <SetupBinaryTab os={os} downloadConfigFile={downloadConfigFile} />}
                {activeTab === 'docker' && <SetupDockerTab token={token} downloadDockerCompose={downloadDockerCompose} />}
                {activeTab === 'cloudflare' && <SetupCloudflareTab />}
                {activeTab === 'terminal' && <SetupOneLinerTab token={token} />}
            </Collapse>
        </Paper>
    );
};
