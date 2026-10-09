import React from 'react';
import { Box, Typography, Paper, IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { useTranslation } from 'react-i18next';

interface DockerCommandCardProps {
    dockerRunCmd: string;
    includeTunnel: boolean;
    tunnelRunCmd: string;
    copiedRun: boolean;
    onCopy: () => void;
}

export const DockerCommandCard: React.FC<DockerCommandCardProps> = ({
    dockerRunCmd,
    includeTunnel,
    tunnelRunCmd,
    copiedRun,
    onCopy,
}) => {
    const { t } = useTranslation();

    return (
        <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    {t('server.setup.docker.run_command', 'Docker 1-Command Quickstart:')}
                </Typography>
                <Tooltip title={copiedRun ? t('server.setup.copied', 'Copied!') : t('server.setup.copy', 'Copy')}>
                    <IconButton size="small" onClick={onCopy} color={copiedRun ? 'success' : 'default'}>
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
    );
};
