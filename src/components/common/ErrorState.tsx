import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { useTranslation } from 'react-i18next';

export interface ErrorStateProps {
  /** Short sentence: what happened. */
  message: string;
  /** Retry handler; when omitted no action is shown. */
  onRetry?: () => void;
  retryLabel?: string;
  dense?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  onRetry,
  retryLabel,
  dense = false,
}) => {
  const { t } = useTranslation();
  return (
    <Box
      role="alert"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
        py: dense ? 2 : 4,
        px: 2,
        textAlign: 'center',
      }}
    >
      <ErrorOutlineRoundedIcon color="error" />
      <Typography variant="body2" color="error">
        {message}
      </Typography>
      {onRetry && (
        <Button variant="outlined" size="small" onClick={onRetry}>
          {retryLabel ?? t('common.retry', 'Retry')}
        </Button>
      )}
    </Box>
  );
};
