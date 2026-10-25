import { alpha, type SxProps, type Theme } from '@mui/material';

/** Drop-down / compact menu paper and its items. */
export const menuPaperSx: SxProps<Theme> = {
  '& .MuiPaper-root': {
    backgroundImage: 'none',
    border: 1,
    borderColor: 'divider',
    borderRadius: 2.5,
    p: 0.5,
    minWidth: 210,
  },
  '& .MuiMenuItem-root': {
    borderRadius: 1.5,
    py: 0.8,
    px: 1.5,
    fontSize: '0.875rem',
    fontWeight: 500,
    gap: 1.25,
    '&.Mui-selected': (theme: Theme) => ({
      bgcolor: alpha(theme.palette.primary.main, 0.12),
      color: 'primary.text',
      fontWeight: 600,
      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
    }),
  },
};

/** Non-interactive group heading inside the compact menu. */
export const menuGroupHeaderSx: SxProps<Theme> = {
  opacity: '0.6 !important',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  py: 0.5,
};

/** Top-level toolbar button; the active one is tinted with the primary colour. */
export const mainMenuBtnSx = (isActive: boolean): SxProps<Theme> => ({
  textTransform: 'none',
  fontWeight: isActive ? 700 : 500,
  fontSize: { xs: '0.8rem', sm: '0.875rem' },
  color: isActive ? 'primary.text' : 'text.secondary',
  bgcolor: (theme) => alpha(theme.palette.primary.main, isActive ? 0.12 : 0),
  border: 1,
  borderColor: (theme) => (isActive ? alpha(theme.palette.primary.main, 0.4) : 'transparent'),
  borderRadius: 2,
  px: { xs: 1, sm: 1.5 },
  py: 0.5,
  minHeight: 48,
  transition: 'color 150ms, background-color 150ms',
  '&:hover': {
    bgcolor: (theme) =>
      isActive ? alpha(theme.palette.primary.main, 0.2) : theme.palette.action.hover,
    color: isActive ? 'primary.text' : 'text.primary',
  },
});
