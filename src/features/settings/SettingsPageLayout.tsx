import React from 'react';
import { Box } from '@mui/material';

/** DESIGN.md §4: text pages (rules, settings) are at most 720px wide. */
const TEXT_COLUMN_MAX = 720;

interface SettingsPageLayoutProps {
  rail: React.ReactNode;
  detail: React.ReactNode;
  /** Narrow screens: show the detail instead of the list. */
  showDetail: boolean;
  isWide: boolean;
}

/**
 * Master-detail frame: rail + detail from `md` up, otherwise list page or detail page.
 * DESIGN.md §4 caps text pages at 720px: that cap applies to the text column (detail, or the
 * list on phones), not to rail + detail together, which would squeeze the detail to ~400px.
 */
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
      gridTemplateColumns: isWide
        ? `minmax(220px, 280px) minmax(0, ${TEXT_COLUMN_MAX}px)`
        : `minmax(0, ${TEXT_COLUMN_MAX}px)`,
      justifyContent: 'center',
      alignItems: 'start',
    }}
  >
    {(isWide || !showDetail) && <Box component="aside">{rail}</Box>}
    {(isWide || showDetail) && <Box component="main">{detail}</Box>}
  </Box>
);
