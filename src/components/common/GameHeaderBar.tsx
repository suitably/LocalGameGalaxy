import React from 'react';
import { alpha, AppBar, Toolbar, type SxProps, type Theme } from '@mui/material';

interface GameHeaderBarProps {
  /** Extra styles for the inner toolbar (height, padding, gap). */
  toolbarSx?: SxProps<Theme>;
  children: React.ReactNode;
}

/** Static in-game top bar shell (flat AppBar with a hairline border) shared by async turn games. */
export const GameHeaderBar: React.FC<GameHeaderBarProps> = ({ toolbarSx, children }) => (
  <AppBar
    position="static"
    elevation={0}
    sx={{
      bgcolor: 'background.default',
      backgroundImage: 'none',
      borderBottom: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
      zIndex: 1100,
    }}
  >
    <Toolbar sx={toolbarSx}>{children}</Toolbar>
  </AppBar>
);
