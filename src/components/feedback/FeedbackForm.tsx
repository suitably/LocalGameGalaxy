import React, { useState } from 'react';
import { alpha, TextField, Button, CircularProgress, Alert, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { submitFeedback } from '../../lib/github';

export interface FeedbackFormProps {
  onClose?: () => void;
  showCloseButton?: boolean;
  disabled?: boolean;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  onClose,
  showCloseButton = false,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackBody, setFeedbackBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
    url?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackTitle.trim() || !feedbackBody.trim()) return;

    setSubmitting(true);
    setStatus(null);

    try {
      const result = await submitFeedback(feedbackTitle.trim(), feedbackBody.trim());

      if (result.success) {
        setStatus({
          type: 'success',
          message: t('settings.submit_success', 'Feedback successfully submitted!'),
          url: result.issueUrl,
        });
        setFeedbackTitle('');
        setFeedbackBody('');
      } else {
        setStatus({
          type: 'error',
          message: t('settings.submit_error', 'Failed to submit feedback: {{error}}', {
            error: result.error,
          }),
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setStatus({
        type: 'error',
        message: t('settings.submit_error', 'Failed to submit feedback: {{error}}', {
          error: message,
        }),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled = disabled || submitting || !feedbackTitle.trim() || !feedbackBody.trim();

  return (
    <form onSubmit={handleSubmit}>
      <TextField
        fullWidth
        label={t('settings.issue_title', 'Title')}
        value={feedbackTitle}
        onChange={(e) => setFeedbackTitle(e.target.value)}
        disabled={disabled || submitting}
        required
        variant="outlined"
        size="small"
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        label={t('settings.issue_body', 'Description')}
        value={feedbackBody}
        onChange={(e) => setFeedbackBody(e.target.value)}
        disabled={disabled || submitting}
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
          sx={{
            mb: 2,
            bgcolor: (theme) =>
              alpha(theme.palette[status.type === 'success' ? 'success' : 'error'].main, 0.2),
            color: 'text.primary',
            border: 1,
            borderColor: status.type === 'success' ? 'success.main' : 'error.main',
          }}
          onClose={() => setStatus(null)}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span>{status.message}</span>
            {status.url && (
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                href={status.url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  alignSelf: 'flex-start',
                  borderColor: (theme) => alpha(theme.palette.text.primary, 0.5),
                  '&:hover': { borderColor: 'text.primary' },
                }}
              >
                {t('settings.view_issue', 'View on GitHub')}
              </Button>
            )}
          </Box>
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1.5 }}>
        {showCloseButton && onClose && (
          <Button
            variant="outlined"
            onClick={onClose}
            fullWidth
            sx={{
              borderColor: (theme) => alpha(theme.palette.text.primary, 0.2),
              color: 'text.secondary',
            }}
          >
            {t('common.close', 'Close')}
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={isSubmitDisabled}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {submitting ? t('settings.submitting', 'Submitting...') : t('settings.submit', 'Submit')}
        </Button>
      </Box>
    </form>
  );
};
