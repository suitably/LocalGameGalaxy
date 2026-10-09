import React from 'react';
import { Box, Button, Typography, Paper, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CodeIcon from '@mui/icons-material/Code';
import { useTranslation } from 'react-i18next';
import { DockerEdition } from './SetupDockerTab';

interface DockerComposeViewerProps {
    composeFilename: string;
    dockerComposeYaml: string;
    edition: DockerEdition;
    includeTunnel: boolean;
    copiedCompose: boolean;
    onCopy: () => void;
    downloadDockerCompose: (edition?: DockerEdition, includeTunnel?: boolean) => void;
}

export const DockerComposeViewer: React.FC<DockerComposeViewerProps> = ({
    composeFilename,
    dockerComposeYaml,
    edition,
    includeTunnel,
    copiedCompose,
    onCopy,
    downloadDockerCompose,
}) => {
    const { t } = useTranslation();

    return (
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
                        onClick={onCopy}
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
    );
};
