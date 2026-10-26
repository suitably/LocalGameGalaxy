import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

export interface SettingsSectionProps {
  /** Anchor id; rendered as `settings-section-<id>`. */
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

/** Card for one settings section; scroll/focus target for `highlight`. */
export const SettingsSection: React.FC<SettingsSectionProps> = ({
  id,
  title,
  description,
  icon,
  children,
}) => (
  <Paper
    id={`settings-section-${id}`}
    tabIndex={-1}
    sx={{
      p: { xs: 2.5, sm: 3, md: 3.5 },
      borderRadius: 5,
      bgcolor: 'background.paper',
      border: 1,
      borderColor: 'divider',
      scrollMarginTop: 80,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: description ? 0.5 : 2 }}>
      {icon}
      <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
    </Box>
    {description && (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {description}
      </Typography>
    )}
    {children}
  </Paper>
);
