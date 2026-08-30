import React, { useState } from 'react';
import { Box, Typography, Paper, Tabs, Tab, IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { useTranslation } from 'react-i18next';

interface SetupOneLinerTabProps {
    token: string;
}

export const SetupOneLinerTab: React.FC<SetupOneLinerTabProps> = ({ token }) => {
    const { t } = useTranslation();
    const [subTab, setSubTab] = useState<'bash' | 'powershell'>('bash');
    const [copied, setCopied] = useState(false);

    const bashCmd = `curl -fsSL https://raw.githubusercontent.com/suitably/LocalGameGalaxy/main/server/release-scripts/quick-install.sh | TOKEN="${token}" bash`;
    const psCmd = `$env:TOKEN="${token}"; iwr -useb https://raw.githubusercontent.com/suitably/LocalGameGalaxy/main/server/release-scripts/quick-install.ps1 | iex`;

    const activeCmd = subTab === 'bash' ? bashCmd : psCmd;

    const handleCopy = () => {
        navigator.clipboard.writeText(activeCmd);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
                {t(
                    'server.setup.terminal.desc',
                    'Run this 1-line command in your terminal to automatically download, configure, and start the server:',
                )}
            </Typography>

            <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                        value={subTab}
                        onChange={(_e, val) => setSubTab(val)}
                        textColor="primary"
                        indicatorColor="primary"
                        sx={{ minHeight: 36 }}
                    >
                        <Tab
                            label={t('server.setup.terminal.bash_tab', 'Linux / macOS (Bash)')}
                            value="bash"
                            sx={{ minHeight: 36, py: 0.5, textTransform: 'none', fontSize: '0.85rem' }}
                        />
                        <Tab
                            label={t('server.setup.terminal.ps_tab', 'Windows (PowerShell)')}
                            value="powershell"
                            sx={{ minHeight: 36, py: 0.5, textTransform: 'none', fontSize: '0.85rem' }}
                        />
                    </Tabs>
                    <Tooltip title={copied ? t('server.setup.copied', 'Copied!') : t('server.setup.copy', 'Copy')}>
                        <IconButton size="small" onClick={handleCopy} color={copied ? 'success' : 'default'}>
                            {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                </Box>

                <Paper
                    sx={{
                        p: 1.5,
                        mt: 1.5,
                        bgcolor: 'rgba(0, 0, 0, 0.6)',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        color: 'primary.light',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        borderRadius: 1.5,
                    }}
                >
                    {activeCmd}
                </Paper>
            </Paper>
        </Box>
    );
};
