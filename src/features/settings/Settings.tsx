import React, { useState } from 'react';
import { Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem, TextField, Button, Alert, CircularProgress } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/TitleContext';

export const Settings: React.FC = () => {
    const { t, i18n } = useTranslation();

    // Set page title
    usePageTitle(t('settings.title', 'Settings'));

    const [feedbackTitle, setFeedbackTitle] = useState('');
    const [feedbackBody, setFeedbackBody] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string; url?: string } | null>(null);

    const handleLanguageChange = (event: SelectChangeEvent) => {
        i18n.changeLanguage(event.target.value);
    };

    const handleFeedbackSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedbackTitle.trim() || !feedbackBody.trim()) return;

        setSubmitting(true);
        setStatus(null);

        const baseUrl = localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000';
        const token = localStorage.getItem('melodiq_helper_token') || '';
        const cleanBaseUrl = baseUrl.replace(/\/$/, "");

        try {
            const res = await fetch(`${cleanBaseUrl}/api/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    title: feedbackTitle.trim(),
                    body: feedbackBody.trim()
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to submit feedback');
            }

            setStatus({
                type: 'success',
                message: t('settings.submit_success', 'Feedback successfully submitted!'),
                url: data.issueUrl
            });
            setFeedbackTitle('');
            setFeedbackBody('');
        } catch (err: any) {
            setStatus({
                type: 'error',
                message: t('settings.submit_error', 'Failed to submit feedback: {{error}}', { error: err.message })
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 'sm', mx: 'auto', mt: 4, pb: 6 }}>
            <Typography variant="h4" gutterBottom>
                {t('settings.title', 'Settings')}
            </Typography>

            <Paper sx={{ p: 4, borderRadius: 3, bgcolor: 'rgba(30, 30, 40, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 6 }}>
                <Typography variant="h6" gutterBottom>
                    {t('settings.language_preferences', 'Language Preferences')}
                </Typography>

                <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel id="language-select-label">{t('settings.ui_language', 'UI Language')}</InputLabel>
                    <Select
                        labelId="language-select-label"
                        id="language-select"
                        value={i18n.language.startsWith('de') ? 'de' : 'en'}
                        label={t('settings.ui_language', 'UI Language')}
                        onChange={handleLanguageChange}
                    >
                        <MenuItem value="en">{t('settings.english', 'English')}</MenuItem>
                        <MenuItem value="de">{t('settings.german', 'Deutsch')}</MenuItem>
                    </Select>
                </FormControl>
            </Paper>

            <Paper sx={{ p: 4, borderRadius: 3, bgcolor: 'rgba(30, 30, 40, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 6, mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                    {t('settings.feedback_title', 'Feedback & Bug Report')}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 3 }}>
                    {t('settings.feedback_desc', 'Found a bug or have a suggestion? Submit it here to create a GitHub issue via your helper server.')}
                </Typography>

                <form onSubmit={handleFeedbackSubmit}>
                    <TextField
                        fullWidth
                        label={t('settings.issue_title', 'Title')}
                        value={feedbackTitle}
                        onChange={(e) => setFeedbackTitle(e.target.value)}
                        disabled={submitting}
                        required
                        variant="outlined"
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        label={t('settings.issue_body', 'Description')}
                        value={feedbackBody}
                        onChange={(e) => setFeedbackBody(e.target.value)}
                        disabled={submitting}
                        required
                        multiline
                        rows={4}
                        variant="outlined"
                        sx={{ mb: 3 }}
                    />
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        fullWidth
                        disabled={submitting || !feedbackTitle.trim() || !feedbackBody.trim()}
                        startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                        {submitting ? t('settings.submitting', 'Submitting...') : t('settings.submit', 'Submit Feedback')}
                    </Button>
                </form>

                {status && (
                    <Alert
                        severity={status.type}
                        sx={{ mt: 3, bgcolor: status.type === 'success' ? 'rgba(46, 125, 50, 0.2)' : 'rgba(211, 47, 47, 0.2)', color: '#fff', border: `1px solid ${status.type === 'success' ? '#2e7d32' : '#d32f2f'}` }}
                        onClose={() => setStatus(null)}
                    >
                        <Typography variant="body2">{status.message}</Typography>
                        {status.url && (
                            <Box sx={{ mt: 1.5 }}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    color="inherit"
                                    href={status.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{ borderColor: 'rgba(255, 255, 255, 0.5)', '&:hover': { borderColor: '#fff' } }}
                                >
                                    {t('settings.view_issue', 'View on GitHub')}
                                </Button>
                            </Box>
                        )}
                    </Alert>
                )}
            </Paper>
        </Box>
    );
};
