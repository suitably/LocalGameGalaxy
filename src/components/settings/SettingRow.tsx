import React from 'react';
import { Box, Typography } from '@mui/material';

export interface SettingRowProps {
  label: string;
  helper?: string;
  /** Control rendered on the right. */
  children: React.ReactNode;
}

/** Label and helper text on the left, control on the right. */
export const SettingRow: React.FC<SettingRowProps> = ({ label, helper, children }) => (
  <Box
    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, py: 1 }}
  >
    <Box sx={{ minWidth: 0 }}>
      <Typography>{label}</Typography>
      {helper && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {helper}
        </Typography>
      )}
    </Box>
    <Box sx={{ flexShrink: 0 }}>{children}</Box>
  </Box>
);
