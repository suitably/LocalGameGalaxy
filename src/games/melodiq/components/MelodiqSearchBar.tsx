import React from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Card,
  Collapse,
  Button,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/SearchRounded';
import CloseIcon from '@mui/icons-material/CloseRounded';
import PublicIcon from '@mui/icons-material/PublicRounded';
import FilterListIcon from '@mui/icons-material/FilterListRounded';
import { useTranslation } from 'react-i18next';
import { SortMenuButton, MultiFilterSelect } from './MelodiqSearchControls';
import { type ActiveFilters, type SortOption } from '../hooks/useSearchFilters';

interface MelodiqSearchBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isOnlineSearch: boolean;
  setIsOnlineSearch: (s: boolean) => void;
  showFilters: boolean;
  setShowFilters: (s: boolean | ((prev: boolean) => boolean)) => void;
  sortOption?: SortOption;
  setSortOption?: (s: SortOption) => void;
  activeFilters: ActiveFilters;
  setActiveFilters: (f: ActiveFilters | ((prev: ActiveFilters) => ActiveFilters)) => void;
  availableGenres: string[];
  availableEditions: string[];
  availableYears: string[];
  availableLanguages: string[];
  clearFilters: () => void;
  filteredSongsLength: number;
  totalSongsLength: number;
  canSearchOnline?: boolean;
}

export const MelodiqSearchBar: React.FC<MelodiqSearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  isOnlineSearch,
  setIsOnlineSearch,
  showFilters,
  setShowFilters,
  sortOption,
  setSortOption,
  activeFilters,
  setActiveFilters,
  availableGenres,
  availableEditions,
  clearFilters,
  filteredSongsLength,
  totalSongsLength,
  canSearchOnline = true,
}) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ flexShrink: 0 }}>
      <Box
        sx={{
          bgcolor: 'background.paper',
          pl: { xs: 2, sm: 3 },
          pr: { xs: 1, sm: 1.5 },
          py: 1,
          mb: showFilters ? 0 : 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <TextField
          placeholder={t('melodiq.search_placeholder')}
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {searchQuery && (
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
                {canSearchOnline && (
                  <IconButton
                    onClick={() => setIsOnlineSearch(!isOnlineSearch)}
                    color={isOnlineSearch ? 'primary' : 'default'}
                    title={t('melodiq.search_online', 'Online suchen')}
                    size="small"
                  >
                    <PublicIcon fontSize="small" />
                  </IconButton>
                )}
              </InputAdornment>
            ),
          }}
          sx={{
            flexGrow: 1,
            '& .MuiOutlinedInput-root': {
              borderRadius: 50,
              bgcolor: 'action.disabledBackground',
              height: 40,
            },
          }}
        />

        {setSortOption && <SortMenuButton sortOption={sortOption} onSelect={setSortOption} />}

        <IconButton
          onClick={() => setShowFilters((prev) => !prev)}
          color={showFilters ? 'primary' : 'inherit'}
          size="large"
          sx={{
            flexShrink: 0,
          }}
        >
          <FilterListIcon />
        </IconButton>
      </Box>

      <Collapse in={showFilters}>
        <Card sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <MultiFilterSelect
            label={t('melodiq.genre')}
            options={availableGenres}
            value={activeFilters.genre}
            onChange={(genre) => setActiveFilters((prev) => ({ ...prev, genre }))}
            minWidth={120}
            maxWidth={200}
          />

          <MultiFilterSelect
            label={t('melodiq.edition')}
            options={availableEditions}
            value={activeFilters.edition}
            onChange={(edition) => setActiveFilters((prev) => ({ ...prev, edition }))}
            minWidth={150}
            maxWidth={250}
          />

          {(activeFilters.year.length > 0 ||
            activeFilters.genre.length > 0 ||
            activeFilters.language.length > 0 ||
            activeFilters.edition.length > 0) && (
            <Button
              size="small"
              onClick={clearFilters}
              color="inherit"
              variant="outlined"
              sx={{ borderRadius: 50 }}
            >
              {t('melodiq.clear_filters')}
            </Button>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            {t('melodiq.songs_count', { filtered: filteredSongsLength, total: totalSongsLength })}
          </Typography>
        </Card>
      </Collapse>
    </Box>
  );
};
