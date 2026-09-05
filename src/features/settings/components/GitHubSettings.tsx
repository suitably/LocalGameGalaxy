import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box, Button, TextField, Typography, Paper, IconButton,
    InputAdornment, Alert, CircularProgress,
} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import { testGitHubToken } from '../../../lib/github';
import { settingsCardSx } from '../settingsStyles';

/**
 * GitHubSettings [ID: COMP-GITHUB-SETTINGS]
 *
 * Allows the user to configure direct GitHub integration via a Personal Access Token.
 * This enables feedback submission and GuessArt catalogue publishing without needing
 * the Nexumia Server as a proxy.
 */

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export const GitHubSettings: React.FC = () => {
    const { t } = useTranslation();
    const [token, setToken] = useState(() => storage.get(STORAGE_KEYS.GITHUB_TOKEN));
    const [owner, setOwner] = useState(() => storage.get(STORAGE_KEYS.GITHUB_OWNER, 'suitably'));
    const [repo, setRepo] = useState(() => storage.get(STORAGE_KEYS.GITHUB_REPO, 'LocalGameGalaxy'));
    const [showToken, setShowToken] = useState(false);
    const [testStatus, setTestStatus] = useState<TestStatus>('idle');
    const [testMsg, setTestMsg] = useState('');

    const handleSave = () => {
        storage.set(STORAGE_KEYS.GITHUB_TOKEN, token);
        storage.set(STORAGE_KEYS.GITHUB_OWNER, owner);
        storage.set(STORAGE_KEYS.GITHUB_REPO, repo);
    };

    const handleTest = async () => {
        handleSave();
        if (!token) {
            setTestStatus('error');
            setTestMsg(t('github.no_token', 'Please enter a GitHub token.'));
            return;
        }

        setTestStatus('testing');
        setTestMsg('');

        const result = await testGitHubToken({ owner, repo, token });
        if (result.valid) {
            setTestStatus('success');
            setTestMsg(
                t('github.test_success', {
                    repo: result.repoName,
                    defaultValue: `Connected to ${result.repoName}`,
                }),
            );
        } else {
            setTestStatus('error');
            setTestMsg(result.error || 'Unknown error');
        }
    };

    const handleClear = () => {
        setToken('');
        setOwner('suitably');
        setRepo('LocalGameGalaxy');
        storage.remove(STORAGE_KEYS.GITHUB_TOKEN);
        storage.remove(STORAGE_KEYS.GITHUB_OWNER);
        storage.remove(STORAGE_KEYS.GITHUB_REPO);
        setTestStatus('idle');
        setTestMsg('');
    };

    return (
        <Paper sx={settingsCardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <GitHubIcon />
                <Typography variant="h6">
                    {t('github.title', 'GitHub Integration')}
                </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1.5 }}>
                {t(
                    'github.desc',
                    'Connect directly to GitHub for feedback and content publishing. Create a Personal Access Token (PAT) with "repo" scope on GitHub.',
                )}
            </Typography>
            <Box sx={{ mb: 2.5 }}>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<OpenInNewIcon fontSize="small" />}
                    component="a"
                    href="https://github.com/settings/tokens/new?description=LocalGameGalaxy&scopes=repo"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                    {t('github.create_token_button', 'Create PAT on GitHub (github.com/settings/tokens)')}
                </Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                    label={t('github.token_label', 'Personal Access Token (PAT)')}
                    variant="outlined"
                    fullWidth
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    size="small"
                    type={showToken ? 'text' : 'password'}
                    slotProps={{
                        input: {
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setShowToken((v) => !v)}
                                        edge="end"
                                        size="small"
                                    >
                                        {showToken ? (
                                            <VisibilityOffIcon fontSize="small" />
                                        ) : (
                                            <VisibilityIcon fontSize="small" />
                                        )}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        },
                    }}
                />

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                        label={t('github.owner', 'Repository Owner')}
                        variant="outlined"
                        value={owner}
                        onChange={(e) => setOwner(e.target.value)}
                        size="small"
                        sx={{ flex: 1 }}
                    />
                    <TextField
                        label={t('github.repo', 'Repository Name')}
                        variant="outlined"
                        value={repo}
                        onChange={(e) => setRepo(e.target.value)}
                        size="small"
                        sx={{ flex: 1 }}
                    />
                </Box>

                {testStatus === 'success' && (
                    <Alert
                        severity="success"
                        icon={<CheckCircleIcon fontSize="inherit" />}
                        sx={{
                            bgcolor: 'rgba(46,125,50,0.15)',
                            color: '#fff',
                            border: '1px solid #2e7d32',
                        }}
                    >
                        {testMsg}
                    </Alert>
                )}

                {testStatus === 'error' && (
                    <Alert
                        severity="error"
                        sx={{
                            bgcolor: 'rgba(211,47,47,0.15)',
                            color: '#fff',
                            border: '1px solid #d32f2f',
                        }}
                    >
                        {testMsg}
                    </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button
                        variant="contained"
                        onClick={handleTest}
                        disabled={testStatus === 'testing'}
                        startIcon={
                            testStatus === 'testing' ? (
                                <CircularProgress size={16} color="inherit" />
                            ) : (
                                <GitHubIcon />
                            )
                        }
                        sx={{ borderRadius: 2 }}
                    >
                        {t('github.test', 'Test & Save')}
                    </Button>
                    {token && (
                        <Button variant="outlined" color="warning" onClick={handleClear} sx={{ borderRadius: 2 }}>
                            {t('github.clear', 'Clear')}
                        </Button>
                    )}
                </Box>
            </Box>
        </Paper>
    );
};
