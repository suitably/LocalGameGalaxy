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

    const dockerRunCmd = `docker run -d --name melodiq-server -p 3000:3000 -p 3001:3001 -e SECURITY_TOKEN="${token}" -v $(pwd)/music:/app/music nexumia/melodiq-server:latest`;

    const dockerComposeYaml = `services:
  # Melodiq Companion Server (Karaoke Media Streaming, USDB & AI Vocal Separation)
  # For AI vocal separation & Whisper, use image: nexumia/melodiq-server:ai
  melodiq-server:
    image: nexumia/melodiq-server:latest
    container_name: melodiq-server
    restart: unless-stopped
    ports:
      - "3000:3000"
      - "3001:3001"
    volumes:
      - ./music:/app/music:ro
    environment:
      - NODE_ENV=production
      - PORT=3000
      - SECURITY_TOKEN="${token}"
      - MUSIC_DIR=/app/music
      - ALLOWED_ORIGINS=*

  # Optional: Public HTTPS Tunnel (Share with friends without port-forwarding)
  melodiq-tunnel:
    image: cloudflare/cloudflared:latest
    container_name: melodiq-tunnel
    restart: unless-stopped
    profiles: ["tunnel"]
    command: tunnel --no-autoupdate run --token \${CLOUDFLARE_TUNNEL_TOKEN:-}`;

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
                        <Chip label=":latest" size="small" color="primary" variant="outlined" />
                        <Typography variant="body2">
                            {t('server.setup.docker.profile_core', 'melodiq-server:latest (Schlanker Server für Relay & Media, ~200MB)')}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label=":ai" size="small" color="secondary" variant="outlined" />
                        <Typography variant="body2">
                            {t('server.setup.docker.profile_ai', 'melodiq-server:ai (Inkl. KI-Stem-Separation & Whisper Text-Abgleich)')}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label="--profile tunnel" size="small" color="info" variant="outlined" />
                        <Typography variant="body2">
                            {t('server.setup.docker.profile_tunnel', 'Cloudflare Quick Tunnel (Öffentliches HTTPS ohne Router-Portfreigabe)')}
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};

