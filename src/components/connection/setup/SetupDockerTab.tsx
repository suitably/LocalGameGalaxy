import React, { useState } from 'react';
import {
    Box,
    Button,
    Typography,
    Paper,
    IconButton,
    Tooltip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    ToggleButtonGroup,
    ToggleButton,
    FormControlLabel,
    Switch,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CodeIcon from '@mui/icons-material/Code';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PsychologyIcon from '@mui/icons-material/Psychology';
import PublicIcon from '@mui/icons-material/Public';
import { useTranslation } from 'react-i18next';

export type DockerEdition = 'standard' | 'ai';

interface SetupDockerTabProps {
    token: string;
    downloadDockerCompose: (edition?: DockerEdition, includeTunnel?: boolean) => void;
}

export const SetupDockerTab: React.FC<SetupDockerTabProps> = ({ token, downloadDockerCompose }) => {
    const { t } = useTranslation();
    const [copiedRun, setCopiedRun] = useState(false);
    const [copiedCompose, setCopiedCompose] = useState(false);
    const [edition, setEdition] = useState<DockerEdition>('standard');
    const [includeTunnel, setIncludeTunnel] = useState<boolean>(false);

    const handleEditionChange = (_: React.MouseEvent<HTMLElement>, newEdition: DockerEdition | null) => {
        if (newEdition) {
            setEdition(newEdition);
        }
    };

    const isAi = edition === 'ai';
    const serverImage = isAi ? 'nexumia/melodiq-server:ai' : 'nexumia/melodiq-server:latest';
    const composeFilename = isAi 
        ? (includeTunnel ? 'docker-compose.ai-tunnel.yml' : 'docker-compose.ai.yml')
        : (includeTunnel ? 'docker-compose.tunnel.yml' : 'docker-compose.yml');

    const dockerRunCmd = isAi
        ? `docker run -d --name melodiq-server -p 3000:3000 -p 3001:3001 -e SECURITY_TOKEN="${token}" -v $(pwd)/music:/app/music -v $(pwd)/models:/app/models:z nexumia/melodiq-server:ai`
        : `docker run -d --name melodiq-server -p 3000:3000 -p 3001:3001 -e SECURITY_TOKEN="${token}" -v $(pwd)/music:/app/music nexumia/melodiq-server:latest`;

    const tunnelRunCmd = `docker run -d --name melodiq-tunnel --net=host cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://localhost:3000`;

    let dockerComposeYaml = `services:
  # Melodiq Companion Server (${isAi ? 'AI Edition: Stems & Whisper' : 'Standard Lightweight ~200MB'})
  melodiq-server:
    image: ${serverImage}
    container_name: melodiq-server
    restart: unless-stopped
    ports:
      - "3000:3000"
      - "3001:3001"
    volumes:
      - ./music:/app/music:ro${isAi ? '\n      - ./models:/app/models:z' : ''}
    environment:
      - NODE_ENV=production
      - PORT=3000
      - SECURITY_TOKEN="${token}"
      - MUSIC_DIR=/app/music
      - ALLOWED_ORIGINS=*`;

    if (includeTunnel) {
        dockerComposeYaml += `

  # Cloudflare Quick Tunnel (Public HTTPS without router port-forwarding)
  melodiq-tunnel:
    image: cloudflare/cloudflared:latest
    container_name: melodiq-tunnel
    restart: unless-stopped
    command: tunnel --no-autoupdate --url http://melodiq-server:3000
    depends_on:
      - melodiq-server`;
    }

    const handleCopyRun = () => {
        const fullCmd = includeTunnel ? `${dockerRunCmd}\n\n# Cloudflare Tunnel starten:\n${tunnelRunCmd}` : dockerRunCmd;
        navigator.clipboard.writeText(fullCmd);
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
                {t('server.setup.docker.desc', 'Wähle deine bevorzugte Server-Edition und optionale Funktionen aus:')}
            </Typography>

            {/* 1. Server Edition Selector (Standard vs AI) */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Server-Edition
                </Typography>
                <ToggleButtonGroup
                    value={edition}
                    exclusive
                    onChange={handleEditionChange}
                    aria-label="Server Edition"
                    sx={{
                        display: 'flex',
                        bgcolor: 'rgba(255, 255, 255, 0.04)',
                        p: 0.5,
                        borderRadius: 2,
                        '& .MuiToggleButton-root': {
                            flex: 1,
                            py: 1.2,
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
                        Standard (~200MB, Leicht)
                    </ToggleButton>
                    <ToggleButton value="ai">
                        <PsychologyIcon fontSize="small" />
                        Mit KI (~2.5GB, Stems & Whisper)
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* 2. Independent Cloudflare Tunnel Checkbox / Switch */}
            <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <PublicIcon color={includeTunnel ? 'primary' : 'action'} sx={{ mt: 0.3 }} />
                        <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                Cloudflare Quick Tunnel einbinden
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Startet parallel einen Tunnel-Container für eine verschlüsselte HTTPS-Freigabe ohne Router-Portweiterleitung oder feste IPv4.
                            </Typography>
                        </Box>
                    </Box>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={includeTunnel}
                                onChange={(e) => setIncludeTunnel(e.target.checked)}
                                color="primary"
                            />
                        }
                        label=""
                        sx={{ m: 0 }}
                    />
                </Box>
            </Paper>

            {/* 3. Docker Run 1-Liner */}
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
                    {includeTunnel && (
                        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.1)', color: 'info.light' }}>
                            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 0.5 }}>
                                # Tunnel separat starten:
                            </Typography>
                            {tunnelRunCmd}
                        </Box>
                    )}
                </Paper>
            </Paper>

            {/* 4. Expandable Docker Compose File */}
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
                            onClick={() => downloadDockerCompose(edition, includeTunnel)}
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
        </Box>
    );
};

