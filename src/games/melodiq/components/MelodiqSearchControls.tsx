import React from 'react';
import { IconButton, Menu, MenuItem } from '@mui/material';
import SortIcon from '@mui/icons-material/SortRounded';
import { useTranslation } from 'react-i18next';
import { type SortOption } from '../hooks/useSearchFilters';

const SORT_OPTIONS: { value: SortOption; labelKey: string }[] = [
  { value: 'title-asc', labelKey: 'melodiq.sort_title_asc' },
  { value: 'title-desc', labelKey: 'melodiq.sort_title_desc' },
  { value: 'artist-asc', labelKey: 'melodiq.sort_artist_asc' },
  { value: 'artist-desc', labelKey: 'melodiq.sort_artist_desc' },
  { value: 'year-desc', labelKey: 'melodiq.sort_year_desc' },
  { value: 'year-asc', labelKey: 'melodiq.sort_year_asc' },
];

interface SortMenuButtonProps {
  sortOption?: SortOption;
  onSelect: (opt: SortOption) => void;
}

/** Sort icon button with its dropdown menu. */
export const SortMenuButton: React.FC<SortMenuButtonProps> = ({ sortOption, onSelect }) => {
  const { t } = useTranslation();
  const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);

  return (
    <>
      <IconButton
        onClick={(e) => setAnchor(e.currentTarget)}
        color={sortOption && sortOption !== 'title-asc' ? 'primary' : 'inherit'}
        size="large"
        title={t('melodiq.sort_by')}
        sx={{ flexShrink: 0 }}
      >
        <SortIcon />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {SORT_OPTIONS.map(({ value, labelKey }) => (
          <MenuItem
            key={value}
            selected={sortOption === value}
            onClick={() => {
              onSelect(value);
              setAnchor(null);
            }}
          >
            {t(labelKey)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
