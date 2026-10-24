import React from 'react';
import { Box, IconButton, Menu, MenuItem as MuiMenuItem } from '@mui/material';
import MenuIcon from '@mui/icons-material/MenuRounded';
import type { MenuItem } from '../../context/HeaderLayoutContext';

interface HeaderOverflowMenuProps {
  items: MenuItem[];
  iconSize: 'small' | 'medium';
}

/** Burger menu for header actions that do not fit the toolbar on small screens. */
export const HeaderOverflowMenu: React.FC<HeaderOverflowMenuProps> = ({ items, iconSize }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const close = () => setAnchorEl(null);

  if (items.length === 0) return null;

  return (
    <div>
      <IconButton
        size="medium"
        edge="end"
        aria-label="menu"
        aria-controls="menu-appbar"
        aria-haspopup="true"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        color="inherit"
        sx={{ ml: 0.5, p: 1.25 }}
      >
        <MenuIcon fontSize={iconSize} />
      </IconButton>
      <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        keepMounted
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={Boolean(anchorEl)}
        onClose={close}
      >
        {items.map((item, index) => (
          <MuiMenuItem
            key={index}
            onClick={() => {
              item.action();
              close();
            }}
            disabled={item.disabled}
            sx={{ minHeight: 48, py: 1.5 }}
          >
            {item.icon && (
              <Box component="span" sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>
                {item.icon}
              </Box>
            )}
            {item.label}
          </MuiMenuItem>
        ))}
      </Menu>
    </div>
  );
};
