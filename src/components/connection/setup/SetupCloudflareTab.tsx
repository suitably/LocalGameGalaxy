import React, { useState } from 'react';
import { Box, Button, Typography, Paper, IconButton, Tooltip } from '@mui/material';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import LaunchIcon from '@mui/icons-material/Launch';
import TerminalIcon from '@mui/icons-material/Terminal';
import { useTranslation } from 'react-i18next';

export const SetupCloudflareTab: React.FC = () => {
    const { t } = useTranslation();
    const [copiedCli, setCopiedCli] = useState(false);

    const deployUrl = 'https://deploy.workers.cloudflare.com/?url=https://github.com/suitably/LocalGameGalaxy/tree/main/server';
    const cliCmd = 'cd server && npx wrangler deploy';

    const handleCopyCli = () => {
        navigator.clipboard.writeText(cliCmd);
        setCopiedCli(true);
        setTimeout(() => setCopiedCli(false), 2500);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CloudQueueIcon color="warning" />
                    {t('server.setup.cloudflare.title', 'Free 24/7 Cloud Server')}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                    {t(
                        'server.setup.cloudflare.desc',
                        'Host your own relay server for free on Cloudflare Workers. Perfect for remote games with friends without keeping a PC running.',
                    )}
                </Typography>

                <Button
                    variant="contained"
                    startIcon={<LaunchIcon />}
                    href={deployUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                        borderRadius: 50,
                        px: 3,
                        py: 1,
                        backgroundImage: 'linear-gradient(45deg, #F38020 30%, #FAAE40 90%)',
                        color: 'white',
                        textTransform: 'none',
                        fontWeight: 'bold',
                    }}
                >
                    {t('server.setup.cloudflare.deploy_button', 'Deploy to Cloudflare Workers')}
                </Button>
            </Paper>

            {/* CLI alternative */}
            <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TerminalIcon fontSize="small" color="primary" />
                        {t('server.setup.cloudflare.cli_title', 'Or deploy via Wrangler CLI from the server/ directory:')}
                    </Typography>
                    <Tooltip title={copiedCli ? t('server.setup.copied', 'Copied!') : t('server.setup.copy', 'Copy')}>
                        <IconButton size="small" onClick={handleCopyCli} color={copiedCli ? 'success' : 'default'}>
                            {copiedCli ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                </Box>
                <Paper
                    sx={{
                        p: 1.5,
                        bgcolor: 'rgba(0, 0, 0, 0.5)',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        color: 'primary.light',
                        borderRadius: 1.5,
                    }}
                >
                    {cliCmd}
                </Paper>
            </Paper>
        </Box>
    );
};
