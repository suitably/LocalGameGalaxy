import React from 'react';
import { Box, Button, Typography, Paper, Chip } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SettingsIcon from '@mui/icons-material/Settings';
import { useTranslation } from 'react-i18next';
import type { DetectedOS } from './useServerAutoDetect';

interface SetupBinaryTabProps {
    os: DetectedOS;
    downloadConfigFile: () => void;
}

const OS_NAMES: Record<DetectedOS, string> = {
    win: 'Windows',
    mac: 'macOS',
    linux: 'Linux',
};

const ARCHIVE_NAMES: Record<DetectedOS, string> = {
    win: 'nexumia-server-win.zip',
    mac: 'nexumia-server-macos.tar.gz',
    linux: 'nexumia-server-linux.tar.gz',
};

const SCRIPT_NAMES: Record<DetectedOS, string> = {
    win: 'start-server.bat',
    mac: 'start-server.command',
    linux: 'start-server.sh (oder NexumiaServer.desktop)',
};

export const SetupBinaryTab: React.FC<SetupBinaryTabProps> = ({ os, downloadConfigFile }) => {
    const { t } = useTranslation();
    const osName = OS_NAMES[os];
    const archiveName = ARCHIVE_NAMES[os];
    const scriptName = SCRIPT_NAMES[os];

    const downloadUrl = `https://github.com/suitably/LocalGameGalaxy/releases/latest/download/${archiveName}`;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography variant="body2" color="text.secondary">
                    {t('server.setup.detected_os', { os: osName, defaultValue: `Detected OS: ${osName}` })}
                </Typography>
                <Chip label={osName} color="primary" size="small" variant="outlined" />
            </Box>

            {/* Step 1 */}
            <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DownloadIcon fontSize="small" color="primary" />
                    {t('server.setup.step_1_title', '1. Download Package & Config')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('server.setup.step_1_desc', 'Download the server archive for your OS and extract it. Save the downloaded config.json into the same folder.')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <Button
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                            borderRadius: 50,
                            px: 3,
                            backgroundImage: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                            color: 'white',
                            textTransform: 'none',
                        }}
                    >
                        {t('server.setup.download_binary', { os: osName, defaultValue: `Download Server Package (${osName})` })}
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<SettingsIcon />}
                        onClick={downloadConfigFile}
                        sx={{ borderRadius: 50, px: 2.5, textTransform: 'none' }}
                    >
                        {t('server.setup.download_config', 'Download Pre-configured config.json')}
                    </Button>
                </Box>
            </Paper>

            {/* Step 2 */}
            <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PlayArrowIcon fontSize="small" color="success" />
                    {t('server.setup.step_2_title', '2. Run Launcher Script')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {t('server.setup.step_2_desc', 'Double-click the startup launcher script:')}
                </Typography>
                <Paper
                    sx={{
                        p: 1.5,
                        bgcolor: 'rgba(0, 0, 0, 0.4)',
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        color: 'primary.light',
                        borderRadius: 1.5,
                    }}
                >
                    📁 {scriptName}
                </Paper>
            </Paper>

            {/* Step 3 */}
            <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {t('server.setup.step_3_title', '3. Auto-Connect')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {t('server.setup.step_3_desc', 'Once the server console window opens, the app will automatically connect to localhost:3000.')}
                </Typography>
            </Paper>
        </Box>
    );
};
