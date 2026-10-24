import type { SxProps, Theme } from '@mui/material';

/** Hides every Excalidraw toolbar and menu so the viewer shows the canvas only. */
export const hiddenExcalidrawChromeSx: SxProps<Theme> = {
  '& .excalidraw': {
    '& .layer-ui__wrapper': {
      display: 'none !important',
      pointerEvents: 'none !important',
    },
    '& .App-menu': {
      display: 'none !important',
    },
    '& .App-top-bar': {
      display: 'none !important',
    },
    '& .App-bottom-bar': {
      display: 'none !important',
    },
    '& .App-toolbar': {
      display: 'none !important',
    },
    '& .dropdown-menu-button': {
      display: 'none !important',
    },
    '& .main-menu-trigger': {
      display: 'none !important',
    },
    '& .zen-mode-transition': {
      display: 'none !important',
    },
    '& .disable-zen-mode': {
      display: 'none !important',
    },
    '& footer': {
      display: 'none !important',
    },
  },
};
