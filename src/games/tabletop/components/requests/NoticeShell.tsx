/**
 * Non-blocking notice frame for hand requests [ID: GAME-TABLETOP-REQUEST-NOTICE-SHELL]
 *
 * #557: a top snackbar with a title, content and an action row; the table stays usable.
 */
import React from 'react';
import { Box, Paper, Snackbar, Typography } from '@mui/material';

interface NoticeShellProps {
  title: string;
  children?: React.ReactNode;
  actions: React.ReactNode;
}

export const NoticeShell: React.FC<NoticeShellProps> = ({ title, children, actions }) => (
  <Snackbar open anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
    <Paper
      elevation={8}
      role="alert"
      sx={{ p: 1.5, width: 'min(420px, calc(100vw - 32px))', borderRadius: 3 }}
    >
      <Typography variant="subtitle2" fontWeight={800}>
        {title}
      </Typography>
      {children}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end', mt: 1 }}>
        {actions}
      </Box>
    </Paper>
  </Snackbar>
);
