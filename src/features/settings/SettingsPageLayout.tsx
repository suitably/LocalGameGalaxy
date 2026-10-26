import React from 'react';
import { Box } from '@mui/material';

interface SettingsPageLayoutProps {
  rail: React.ReactNode;
  detail: React.ReactNode;
  /** Narrow screens: show the detail instead of the list. */
  showDetail: boolean;
  isWide: boolean;
}

/** Master-detail frame: rail + detail from `md` up, otherwise list page or detail page. */
export const SettingsPageLayout: React.FC<SettingsPageLayoutProps> = ({
  rail,
  detail,
  showDetail,
  isWide,
}) => (
  <Box
    sx={{
      width: '100%',
      maxWidth: 'lg',
      mx: 'auto',
      mt: { xs: 1, sm: 2 },
      px: { xs: 1, sm: 2 },
      pb: 6,
      display: 'grid',
      gap: 3,
      gridTemplateColumns: isWide ? 'minmax(220px, 280px) minmax(0, 1fr)' : 'minmax(0, 1fr)',
      alignItems: 'start',
    }}
  >
    {(isWide || !showDetail) && <Box component="aside">{rail}</Box>}
    {(isWide || showDetail) && <Box component="main">{detail}</Box>}
  </Box>
);
