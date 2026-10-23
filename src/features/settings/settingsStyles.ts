import { alpha, type SxProps, type Theme } from '@mui/material';

/**
 * Shared styling for all Settings cards and containers (DESIGN.md §6):
 * flat surfaces separated by colour and a subtle border, sun-yellow for the selected item.
 */

const selected = (theme: Theme) => ({
  color: theme.palette.primary.main,
  backgroundColor: alpha(theme.palette.primary.main, 0.12),
  border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
});

const quietHover = {
  color: 'text.primary',
  bgcolor: 'action.hover',
};

// 1. Unified Card Style
export const settingsCardSx: SxProps<Theme> = {
  p: { xs: 2.5, sm: 3, md: 3.5 },
  borderRadius: 5,
  bgcolor: 'background.paper',
  border: 1,
  borderColor: 'divider',
};

// 2. Level 1: Main Category Tabs Bar
export const mainTabsBarSx: SxProps<Theme> = {
  p: 0.75,
  mb: 3.5,
  borderRadius: 4,
  bgcolor: 'background.paper',
  border: 1,
  borderColor: 'divider',
};

export const mainTabSx: SxProps<Theme> = {
  minHeight: 46,
  py: 1.25,
  px: { xs: 2, sm: 3 },
  textTransform: 'none',
  fontWeight: 600,
  fontSize: { xs: '0.875rem', sm: '0.95rem' },
  borderRadius: 3,
  gap: 1.25,
  color: 'text.secondary',
  border: '1px solid transparent',
  transition: 'color 150ms, background-color 150ms',
  '&:hover': quietHover,
  '&.Mui-selected': (theme: Theme) => ({ ...selected(theme), fontWeight: 700 }),
};

// 3. Level 2: Sub-Category Pill Navigation
export const subTabsBarSx: SxProps<Theme> = {
  display: 'inline-flex',
  p: 0.5,
  mb: 3,
  borderRadius: 3,
  bgcolor: 'background.default',
  border: 1,
  borderColor: 'divider',
  maxWidth: '100%',
};

export const subTabSx: SxProps<Theme> = {
  minHeight: 38,
  py: 0.75,
  px: 2,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.875rem',
  borderRadius: 2,
  gap: 0.8,
  color: 'text.secondary',
  border: '1px solid transparent',
  transition: 'color 150ms, background-color 150ms',
  '&:hover': quietHover,
  '&.Mui-selected': (theme: Theme) => ({ ...selected(theme), fontWeight: 700 }),
};

// 4. Level 3: Segmented Control (Toggle Button Group)
export const segmentedGroupSx: SxProps<Theme> = {
  bgcolor: 'background.default',
  border: 1,
  borderColor: 'divider',
  borderRadius: 3,
  p: 0.5,
  gap: 0.5,
  display: 'inline-flex',
  width: 'fit-content',
  maxWidth: '100%',
  overflowX: 'auto',
  '& .MuiToggleButton-root': {
    border: '1px solid transparent',
    borderRadius: '8px !important',
    px: 2,
    py: 0.8,
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.85rem',
    color: 'text.secondary',
    gap: 1,
    whiteSpace: 'nowrap',
    transition: 'color 150ms, background-color 150ms',
    '&:hover': quietHover,
    '&.Mui-selected': selected,
  },
};

// 5. Sub-Navigation Pill Button Style
export const subPillSx = (isActive: boolean): SxProps<Theme> => ({
  textTransform: 'none',
  fontWeight: isActive ? 700 : 500,
  fontSize: '0.8rem',
  color: isActive ? 'primary.main' : 'text.secondary',
  bgcolor: (theme) => alpha(theme.palette.primary.main, isActive ? 0.12 : 0),
  border: 1,
  borderColor: (theme) =>
    isActive ? alpha(theme.palette.primary.main, 0.4) : theme.palette.divider,
  borderRadius: 5,
  px: 1.5,
  py: 0.3,
  minHeight: 28,
  whiteSpace: 'nowrap',
  transition: 'color 150ms, background-color 150ms',
  '&:hover': {
    bgcolor: (theme) => alpha(theme.palette.primary.main, isActive ? 0.2 : 0.06),
    color: 'text.primary',
  },
});
