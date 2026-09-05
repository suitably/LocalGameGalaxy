import type { SxProps, Theme } from '@mui/material';

/**
 * Shared styling for all Settings cards and containers.
 * Ensures a 100% cohesive, modern dark glassmorphism design language.
 */

// 1. Unified Card Style
export const settingsCardSx: SxProps<Theme> = {
    p: { xs: 2.5, sm: 3, md: 3.5 },
    borderRadius: 3,
    bgcolor: 'rgba(24, 27, 38, 0.8)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.25)',
};

// 2. Level 1: Main Category Tabs Bar
export const mainTabsBarSx: SxProps<Theme> = {
    p: 0.75,
    mb: 3.5,
    borderRadius: 3,
    bgcolor: 'rgba(20, 23, 34, 0.85)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
};

export const mainTabSx: SxProps<Theme> = {
    minHeight: 46,
    py: 1.25,
    px: { xs: 2, sm: 3 },
    textTransform: 'none',
    fontWeight: 600,
    fontSize: { xs: '0.875rem', sm: '0.95rem' },
    borderRadius: 2.5,
    gap: 1.25,
    color: 'rgba(255, 255, 255, 0.65)',
    border: '1px solid transparent',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
        color: 'rgba(255, 255, 255, 0.9)',
        bgcolor: 'rgba(255, 255, 255, 0.05)',
    },
    '&.Mui-selected': {
        color: '#90caf9',
        bgcolor: 'rgba(144, 202, 249, 0.12)',
        border: '1px solid rgba(144, 202, 249, 0.35)',
        fontWeight: 700,
        boxShadow: '0 2px 8px rgba(144, 202, 249, 0.08)',
    },
};

// 3. Level 2: Sub-Category Pill Navigation
export const subTabsBarSx: SxProps<Theme> = {
    display: 'inline-flex',
    p: 0.5,
    mb: 3,
    borderRadius: 3,
    bgcolor: 'rgba(15, 17, 26, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
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
    color: 'rgba(255, 255, 255, 0.6)',
    border: '1px solid transparent',
    transition: 'all 0.2s ease',
    '&:hover': {
        color: 'rgba(255, 255, 255, 0.9)',
        bgcolor: 'rgba(255, 255, 255, 0.04)',
    },
    '&.Mui-selected': {
        color: '#90caf9',
        bgcolor: 'rgba(144, 202, 249, 0.1)',
        border: '1px solid rgba(144, 202, 249, 0.25)',
        fontWeight: 700,
    },
};

// 4. Level 3: Segmented Control (Toggle Button Group)
export const segmentedGroupSx: SxProps<Theme> = {
    bgcolor: 'rgba(15, 17, 26, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 2.5,
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
        color: 'rgba(255, 255, 255, 0.6)',
        gap: 1,
        whiteSpace: 'nowrap',
        transition: 'all 0.15s ease',
        '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.04)',
            color: 'rgba(255, 255, 255, 0.9)',
        },
        '&.Mui-selected': {
            color: '#90caf9',
            bgcolor: 'rgba(144, 202, 249, 0.12)',
            border: '1px solid rgba(144, 202, 249, 0.25)',
        },
    },
};
