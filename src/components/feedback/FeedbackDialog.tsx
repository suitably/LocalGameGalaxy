import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Alert, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

export const FeedbackDialog: React.FC = () => {
    const { t } = useTranslation();
    const dialogRef = useRef<HTMLDialogElement>(null);

    const [feedbackTitle, setFeedbackTitle] = useState('');
    const [feedbackBody, setFeedbackBody] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string; url?: string } | null>(null);

    // Expose open method via custom event so GlobalHeader can trigger it
    useEffect(() => {
        const handleOpen = () => {
            setStatus(null);
            dialogRef.current?.showModal();
        };
        window.addEventListener('feedback:open', handleOpen);
        return () => window.removeEventListener('feedback:open', handleOpen);
    }, []);

    const handleClose = () => {
        dialogRef.current?.close();
    };

    // Close on backdrop click
    const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
        if (e.target === dialogRef.current) handleClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedbackTitle.trim() || !feedbackBody.trim()) return;

        setSubmitting(true);
        setStatus(null);

        const baseUrl = localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000';
        const token = localStorage.getItem('melodiq_helper_token') || '';
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');

        try {
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
        } catch (err: any) {
            setStatus({
                type: 'error',
                message: t('settings.submit_error', 'Failed to submit feedback: {{error}}', { error: err.message }),
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <dialog
            ref={dialogRef}
            onClick={handleDialogClick}
            style={{
                border: 'none',
                borderRadius: '16px',
                padding: 0,
                background: 'transparent',
                maxWidth: '480px',
                width: '90vw',
                backdropFilter: 'blur(8px)',
            }}
        >
            <Box sx={{
                bgcolor: 'rgba(22, 22, 35, 0.97)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4,
                p: 4,
                color: 'white',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {t('settings.feedback_title', 'Feedback & Bug Report')}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            {t('settings.feedback_desc', 'Creates a GitHub issue via your Helper Server.')}
                        </Typography>
                    </Box>
                    <IconButton onClick={handleClose} size="small" sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: 'white' } }}>
                        <CloseIcon />
                    </IconButton>
                </Box>

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
                            disabled={submitting || !feedbackTitle.trim() || !feedbackBody.trim()}
                            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
                        >
                            {submitting ? t('settings.submitting', 'Submitting...') : t('settings.submit', 'Submit')}
                        </Button>
                    </Box>
                </form>
            </Box>
        </dialog>
    );
};
