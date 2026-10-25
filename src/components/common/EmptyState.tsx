import React from 'react';
import { Box, Button, Typography } from '@mui/material';

export interface EmptyStateProps {
  /** Short sentence: what is missing / what to do. */
  message: string;
  /** Optional icon or area symbol shown above the sentence. */
  icon?: React.ReactNode;
  /** Optional single action. */
  actionLabel?: string;
  onAction?: () => void;
  /** Reduces padding for use inside dense lists. */
  dense?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  icon,
  actionLabel,
  onAction,
  dense = false,
}) => (
  <Box
    role="status"
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
    {icon && <Box sx={{ display: 'flex', color: 'text.disabled' }}>{icon}</Box>}
    <Typography variant="body2" color="text.secondary">
      {message}
    </Typography>
    {actionLabel && onAction && (
      <Button variant="outlined" size="small" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </Box>
);
