import React, { useState } from 'react';
import {
    Box,
    Button,
    Typography,
    Paper,
    IconButton,
    Tooltip,
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import DownloadIcon from '@mui/icons-material/Download';
import LayersIcon from '@mui/icons-material/Layers';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CodeIcon from '@mui/icons-material/Code';
import { useTranslation } from 'react-i18next';

interface SetupDockerTabProps {
    token: string;
    downloadDockerCompose: () => void;
}

export const SetupDockerTab: React.FC<SetupDockerTabProps> = ({ token, downloadDockerCompose }) => {
    const { t } = useTranslation();
    const [copiedRun, setCopiedRun] = useState(false);
    const [copiedCompose, setCopiedCompose] = useState(false);

    const dockerRunCmd = `docker run -d --name galaxy-server -p 3000:3000 -e SECURITY_TOKEN="${token}" -v $(pwd)/music:/app/music localgamegalaxy/server:latest`;

    const dockerComposeYaml = `services:
  galaxy-server:
    image: localgamegalaxy/server:latest
    container_name: galaxy-server
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./music:/app/music
      - ./config.json:/app/config.json:ro
    environment:
      - NODE_ENV=production
      - PORT=3000
      - PLUGINS=relay,melodiq
      - ALLOWED_ORIGINS=*

  galaxy-tunnel:
    image: cloudflare/cloudflared:latest
    container_name: galaxy-tunnel
    restart: unless-stopped
    profiles: ["tunnel"]
    command: tunnel --no-autoupdate run --token \${CLOUDFLARE_TUNNEL_TOKEN:-}

  galaxy-ai:
    image: localgamegalaxy/melodiq-ai:latest
    container_name: galaxy-ai
    restart: unless-stopped
    profiles: ["ai"]
    ports:
      - "5000:5000"
    environment:
      - SERVER_URL=http://galaxy-server:3000
      - SECURITY_TOKEN="${token}"`;

    const handleCopyRun = () => {
        navigator.clipboard.writeText(dockerRunCmd);
        setCopiedRun(true);
        setTimeout(() => setCopiedRun(false), 2500);
    };

    const handleCopyCompose = () => {
        navigator.clipboard.writeText(dockerComposeYaml);
        setCopiedCompose(true);
        setTimeout(() => setCopiedCompose(false), 2500);
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
                        <IconButton size="small" onClick={handleCopyRun} color={copiedRun ? 'success' : 'default'}>
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

            {/* Expandable Docker Compose File & Profiles */}
            <Accordion
                defaultExpanded={false}
                sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px !important',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    '&:before': { display: 'none' },
                }}
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}
                    sx={{ px: 2 }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CodeIcon fontSize="small" color="primary" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            {t('server.setup.docker.compose_file_title', 'docker-compose.yml Konfiguration')}
                        </Typography>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 1.5 }}>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={copiedCompose ? <CheckIcon /> : <ContentCopyIcon />}
                            onClick={handleCopyCompose}
                            color={copiedCompose ? 'success' : 'primary'}
                            sx={{ borderRadius: 50, textTransform: 'none' }}
                        >
                            {copiedCompose ? t('server.setup.copied', 'Kopiert!') : t('server.setup.docker.copy_compose', 'YAML kopieren')}
                        </Button>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<DownloadIcon />}
                            onClick={downloadDockerCompose}
                            sx={{ borderRadius: 50, textTransform: 'none' }}
                        >
                            {t('server.setup.docker.download_compose', 'Download docker-compose.yml')}
                        </Button>
                    </Box>

                    <Paper
                        sx={{
                            p: 1.5,
                            bgcolor: 'rgba(0, 0, 0, 0.6)',
                            fontFamily: 'monospace',
                            fontSize: '0.8rem',
                            overflowX: 'auto',
                            whiteSpace: 'pre',
                            color: '#a5d6a7',
                            borderRadius: 1.5,
                            maxHeight: 280,
                            overflowY: 'auto',
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}
                    >
                        {dockerComposeYaml}
                    </Paper>
                </AccordionDetails>
            </Accordion>

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

