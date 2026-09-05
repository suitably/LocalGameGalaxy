import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Alert, IconButton, Dialog } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { resolveGitHubConfig, createGitHubIssue, hasGitHubPAT } from '../../lib/github';
import { storage } from '../../lib/storage';

export const FeedbackDialog: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    const [feedbackTitle, setFeedbackTitle] = useState('');
    const [feedbackBody, setFeedbackBody] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [hasGithubConfig, setHasGithubConfig] = useState(true);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string; url?: string } | null>(null);

    const checkConfig = useCallback(() => {
        setHasGithubConfig(hasGitHubPAT());
    }, []);

    // Expose open method via custom event so GlobalHeader can trigger it
    useEffect(() => {
        const handleOpen = () => {
            if (!hasGitHubPAT()) {
                navigate('/settings?tab=general&sub=feedback&missing_pat=1');
                return;
            }
            setStatus(null);
            checkConfig();
            setOpen(true);
        };
        window.addEventListener('feedback:open', handleOpen);
        return () => window.removeEventListener('feedback:open', handleOpen);
    }, [checkConfig, navigate]);

    const handleClose = () => {
        setOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedbackTitle.trim() || !feedbackBody.trim()) return;

        setSubmitting(true);
        setStatus(null);

        const { config: ghConfig, source } = resolveGitHubConfig();

        try {
            if (source === 'local' && ghConfig) {
                // Direct GitHub API call with local PAT
                const result = await createGitHubIssue(ghConfig, {
                    title: `[Feedback] ${feedbackTitle.trim()}`,
                    body: feedbackBody.trim(),
                    labels: ['user-feedback'],
                });

                if (result.success) {
                    setStatus({
                        type: 'success',
                        message: t('settings.submit_success', 'Feedback successfully submitted!'),
                        url: result.issueUrl,
                    });
                    setFeedbackTitle('');
                    setFeedbackBody('');
                } else {
                    throw new Error(result.error || 'Failed to create issue');
                }
            } else if (source === 'server') {
                // Proxy through Nexumia Server
                const baseUrl = storage.getHelperUrl();
                const token = storage.getHelperToken();
                const cleanBaseUrl = baseUrl.replace(/\/$/, '');

                const res = await fetch(`${cleanBaseUrl}/api/feedback`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                        title: feedbackTitle.trim(),
                        body: feedbackBody.trim(),
                    }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to submit feedback');

                setStatus({
                    type: 'success',
                    message: t('settings.submit_success', 'Feedback successfully submitted!'),
                    url: data.issueUrl,
                });
                setFeedbackTitle('');
                setFeedbackBody('');
            } else {
                throw new Error(
                    t(
                        'settings.feedback_no_config',
                        'No GitHub connection configured. Please set up a GitHub Token in General Settings or connect a Nexumia Server.',
                    ),
                );
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setStatus({
                type: 'error',
                message: t('settings.submit_error', 'Failed to submit feedback: {{error}}', { error: message }),
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (!open || !hasGitHubPAT()) {
        return null;
    }

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: 'rgba(22, 22, 35, 0.97)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 4,
                    p: 3,
                    color: 'white',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(12px)',
                }
            }}
        >
            <Box>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {t('settings.feedback_title', 'Feedback & Bug Report')}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            {t('settings.feedback_desc', 'Creates a GitHub issue via your configured connection.')}
                        </Typography>
                    </Box>
                    <IconButton onClick={handleClose} size="small" sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: 'white' } }}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                {!hasGithubConfig && (
                    <Alert
                        severity="warning"
                        icon={<VpnKeyRoundedIcon fontSize="inherit" />}
                        sx={{
                            mb: 2.5,
                            bgcolor: 'rgba(237, 108, 2, 0.15)',
                            color: '#fff',
                            border: '1px solid rgba(237, 108, 2, 0.4)',
                            '& .MuiAlert-icon': { color: '#ffb74d' },
                        }}
                    >
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {t('settings.github_missing_title', 'GitHub-Verbindung erforderlich')}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', mb: 1.5, color: 'rgba(255,255,255,0.8)' }}>
                            {t(
                                'settings.github_missing_desc',
                                'Um Feedback oder Fehlermeldungen direkt als Issue zu senden, hinterlege bitte zuerst ein Personal Access Token (PAT) in den Einstellungen.',
                            )}
                        </Typography>
                        <Button
                            variant="contained"
                            color="warning"
                            size="small"
                            startIcon={<SettingsIcon />}
                            onClick={() => {
                                handleClose();
                                navigate('/settings');
                            }}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                            {t('settings.open_settings', 'Zu den Einstellungen')}
                        </Button>
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label={t('settings.issue_title', 'Title')}
                        value={feedbackTitle}
                        onChange={e => setFeedbackTitle(e.target.value)}
                        disabled={submitting}
                        required
                        variant="outlined"
                        size="small"
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        label={t('settings.issue_body', 'Description')}
                        value={feedbackBody}
                        onChange={e => setFeedbackBody(e.target.value)}
                        disabled={submitting}
                        required
                        multiline
                        rows={4}
                        variant="outlined"
                        size="small"
                        sx={{ mb: 3 }}
                    />

                    {status && (
                        <Alert
                            severity={status.type}
                            sx={{ mb: 2, bgcolor: status.type === 'success' ? 'rgba(46,125,50,0.2)' : 'rgba(211,47,47,0.2)', color: '#fff', border: `1px solid ${status.type === 'success' ? '#2e7d32' : '#d32f2f'}` }}
                            onClose={() => setStatus(null)}
                        >
                            <Typography variant="body2">{status.message}</Typography>
                            {status.url && (
                                <Button
                                    size="small"
                                    href={status.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{ mt: 1, color: '#90caf9' }}
                                >
                                    {t('settings.view_issue', 'View on GitHub')}
                                </Button>
                            )}
                        </Alert>
                    )}

                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button
                            variant="outlined"
                            onClick={handleClose}
                            fullWidth
                            sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}
                        >
                            {t('common.close', 'Close')}
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            disabled={submitting || !feedbackTitle.trim() || !feedbackBody.trim() || !hasGithubConfig}
                            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
                        >
                            {submitting ? t('settings.submitting', 'Submitting...') : t('settings.submit', 'Submit')}
                        </Button>
                    </Box>
                </form>
            </Box>
        </Dialog>
    );
};
