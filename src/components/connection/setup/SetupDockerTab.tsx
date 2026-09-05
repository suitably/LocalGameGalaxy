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
    ToggleButtonGroup,
    ToggleButton,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import DownloadIcon from '@mui/icons-material/Download';
import LayersIcon from '@mui/icons-material/Layers';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CodeIcon from '@mui/icons-material/Code';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PsychologyIcon from '@mui/icons-material/Psychology';
import PublicIcon from '@mui/icons-material/Public';
import { useTranslation } from 'react-i18next';

export type DockerPreset = 'standard' | 'ai' | 'tunnel';

interface SetupDockerTabProps {
    token: string;
    downloadDockerCompose: (preset?: DockerPreset) => void;
}

export const SetupDockerTab: React.FC<SetupDockerTabProps> = ({ token, downloadDockerCompose }) => {
    const { t } = useTranslation();
    const [copiedRun, setCopiedRun] = useState(false);
    const [copiedCompose, setCopiedCompose] = useState(false);
    const [preset, setPreset] = useState<DockerPreset>('standard');

    const handlePresetChange = (_: React.MouseEvent<HTMLElement>, newPreset: DockerPreset | null) => {
        if (newPreset) {
            setPreset(newPreset);
        }
    };

    let dockerRunCmd = `docker run -d --name melodiq-server -p 3000:3000 -p 3001:3001 -e SECURITY_TOKEN="${token}" -v $(pwd)/music:/app/music nexumia/melodiq-server:latest`;
    let dockerComposeYaml = '';
    let composeFilename = 'docker-compose.yml';

    if (preset === 'ai') {
        dockerRunCmd = `docker run -d --name melodiq-server -p 3000:3000 -p 3001:3001 -e SECURITY_TOKEN="${token}" -v $(pwd)/music:/app/music -v $(pwd)/models:/app/models:z nexumia/melodiq-server:ai`;
        composeFilename = 'docker-compose.ai.yml';
        dockerComposeYaml = `services:
  # Melodiq Companion Server (AI Edition: Vocal Separation & Whisper)
  melodiq-server:
    image: nexumia/melodiq-server:ai
    container_name: melodiq-server
    restart: unless-stopped
    ports:
      - "3000:3000"
      - "3001:3001"
    volumes:
      - ./music:/app/music:ro
      - ./models:/app/models:z
    environment:
      - NODE_ENV=production
      - PORT=3000
      - SECURITY_TOKEN="${token}"
      - MUSIC_DIR=/app/music
      - ALLOWED_ORIGINS=*`;
    } else if (preset === 'tunnel') {
        dockerRunCmd = `docker run -d --name melodiq-server -p 3000:3000 -p 3001:3001 -e SECURITY_TOKEN="${token}" -v $(pwd)/music:/app/music nexumia/melodiq-server:latest`;
        composeFilename = 'docker-compose.tunnel.yml';
        dockerComposeYaml = `services:
  # Melodiq Companion Server (Core Service)
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

  # Cloudflare Quick Tunnel (Public HTTPS without router port-forwarding)
  melodiq-tunnel:
    image: cloudflare/cloudflared:latest
    container_name: melodiq-tunnel
    restart: unless-stopped
    command: tunnel --no-autoupdate --url http://melodiq-server:3000
    depends_on:
      - melodiq-server`;
    } else {
        composeFilename = 'docker-compose.yml';
        dockerComposeYaml = `services:
  # Melodiq Companion Server (Standard Lightweight ~200MB)
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
      - ALLOWED_ORIGINS=*`;
    }

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
                {t('server.setup.docker.desc', 'Wähle den passenden Use-Case für deinen Melodiq-Server aus:')}
            </Typography>

            {/* Use-Case Presets Switcher */}
            <ToggleButtonGroup
                value={preset}
                exclusive
                onChange={handlePresetChange}
                aria-label="Docker compose preset"
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    bgcolor: 'rgba(255, 255, 255, 0.04)',
                    p: 0.5,
                    borderRadius: 2,
                    '& .MuiToggleButton-root': {
                        flex: 1,
                        minWidth: 150,
                        py: 1,
                        textTransform: 'none',
                        fontWeight: 'bold',
                        color: 'text.secondary',
                        border: 'none',
                        borderRadius: '8px !important',
                        gap: 1,
                        '&.Mui-selected': {
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            '&:hover': {
                                bgcolor: 'primary.dark',
                            },
                        },
                    },
                }}
            >
                <ToggleButton value="standard">
                    <MusicNoteIcon fontSize="small" />
                    Standard (Leicht)
                </ToggleButton>
                <ToggleButton value="ai">
                    <PsychologyIcon fontSize="small" />
                    Mit KI (Stems & Whisper)
                </ToggleButton>
                <ToggleButton value="tunnel">
                    <PublicIcon fontSize="small" />
                    Mit Cloudflare Tunnel
                </ToggleButton>
            </ToggleButtonGroup>

            {/* Docker Run 1-Liner */}
            <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {preset === 'tunnel' 
                            ? 'Docker 1-Command Server (Tunnel per Compose starten):'
                            : t('server.setup.docker.run_command', 'Docker 1-Command Quickstart:')}
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
                defaultExpanded={true}
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
                            {composeFilename} {t('server.setup.docker.compose_file_title', 'Konfiguration')}
                        </Typography>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
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
                            onClick={() => downloadDockerCompose(preset)}
                            sx={{ borderRadius: 50, textTransform: 'none' }}
                        >
                            Download {composeFilename}
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

            {/* Presets Info Box */}
            <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LayersIcon fontSize="small" color="primary" />
                        Verfügbare Use-Cases:
                    </Typography>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => downloadDockerCompose(preset)}
                        sx={{ borderRadius: 50, textTransform: 'none' }}
                    >
                        Download {composeFilename}
                    </Button>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label="Standard" size="small" color={preset === 'standard' ? 'primary' : 'default'} variant="outlined" />
                        <Typography variant="body2">
                            <strong>docker-compose.yml:</strong> Schlank (~200MB), Media-Streaming, USDB-Songsuche, yt-dlp & Relay.
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label="AI Edition" size="small" color={preset === 'ai' ? 'secondary' : 'default'} variant="outlined" />
                        <Typography variant="body2">
                            <strong>docker-compose.ai.yml:</strong> Full AI (~2.5GB) mit PyTorch, automatischer Gesangs-Extraktion & Whisper.
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label="Mit Tunnel" size="small" color={preset === 'tunnel' ? 'info' : 'default'} variant="outlined" />
                        <Typography variant="body2">
                            <strong>docker-compose.tunnel.yml:</strong> Inklusive Cloudflare Quick Tunnel (Öffentliches HTTPS ohne Router-Portfreigabe).
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};

