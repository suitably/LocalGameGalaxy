import React, { useState } from 'react';
import { Box, Button, Typography, Paper, IconButton, Tooltip, Chip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import DownloadIcon from '@mui/icons-material/Download';
import LayersIcon from '@mui/icons-material/Layers';
import { useTranslation } from 'react-i18next';

interface SetupDockerTabProps {
    token: string;
    downloadDockerCompose: () => void;
}

export const SetupDockerTab: React.FC<SetupDockerTabProps> = ({ token, downloadDockerCompose }) => {
    const { t } = useTranslation();
    const [copiedRun, setCopiedRun] = useState(false);

    const dockerRunCmd = `docker run -d --name galaxy-server -p 3000:3000 -e SECURITY_TOKEN="${token}" -v $(pwd)/music:/app/music localgamegalaxy/server:latest`;

    const handleCopy = () => {
        navigator.clipboard.writeText(dockerRunCmd);
        setCopiedRun(true);
        setTimeout(() => setCopiedRun(false), 2500);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography variant="body2" color="text.secondary">
                {t('server.setup.docker.desc', 'Run the server via Docker container. Includes your pre-configured Master Token and Port 3000.')}
            </Typography>

            {/* Docker Run 1-Liner */}
            <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {t('server.setup.docker.run_command', 'Docker 1-Command Quickstart:')}
                    </Typography>
                    <Tooltip title={copiedRun ? t('server.setup.copied', 'Copied!') : t('server.setup.copy', 'Copy')}>
                        <IconButton size="small" onClick={handleCopy} color={copiedRun ? 'success' : 'default'}>
                            {copiedRun ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                </Box>
                <Paper
                    sx={{
                        p: 1.5,
                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        color: 'primary.light',
                        borderRadius: 1.5,
                    }}
                >
                    {dockerRunCmd}
                </Paper>
            </Paper>

            {/* Docker Compose Download & Profiles */}
            <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LayersIcon fontSize="small" color="primary" />
                        {t('server.setup.docker.profiles_title', 'Included Docker Profiles:')}
                    </Typography>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={downloadDockerCompose}
                        sx={{ borderRadius: 50, textTransform: 'none' }}
                    >
                        {t('server.setup.docker.download_compose', 'Download docker-compose.yml')}
                    </Button>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label="Core" size="small" color="primary" variant="outlined" />
                        <Typography variant="body2">
                            {t('server.setup.docker.profile_core', 'Core Relay & Media (Lightweight, ~200MB)')}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label="--profile tunnel" size="small" color="info" variant="outlined" />
                        <Typography variant="body2">
                            {t('server.setup.docker.profile_tunnel', 'Cloudflare Quick Tunnel (Public HTTPS without router port-forwarding)')}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label="--profile ai" size="small" color="secondary" variant="outlined" />
                        <Typography variant="body2">
                            {t('server.setup.docker.profile_ai', 'Melodiq AI Worker (ONNX Vocal Separation & Whisper AI)')}
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};
