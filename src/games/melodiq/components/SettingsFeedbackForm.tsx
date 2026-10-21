import React from 'react';
import { Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { FeedbackForm } from '../../../components/feedback/FeedbackForm';

export const SettingsFeedbackForm: React.FC = () => {
    const { t } = useTranslation();

    return (
        <Paper sx={{ p: 4, borderRadius: 3, bgcolor: 'rgba(30, 30, 40, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 6, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
                {t('settings.feedback_title', 'Feedback & Bug Report')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 3 }}>
                {t('settings.feedback_desc', 'Found a bug or have a suggestion? Submit it here to create a GitHub issue via your helper server.')}
            </Typography>

            <FeedbackForm />
        </Paper>
    );
};
