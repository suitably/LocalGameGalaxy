import React, { useState } from 'react';
import { Box, TextField, InputAdornment, IconButton, Card, Collapse, FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, Button, Typography, Menu } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import PublicIcon from '@mui/icons-material/Public';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import { useTranslation } from 'react-i18next';
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
}

export const MelodiqSearchBar: React.FC<MelodiqSearchBarProps> = ({
    searchQuery, setSearchQuery,
    isOnlineSearch, setIsOnlineSearch,
    showFilters, setShowFilters,
    sortOption, setSortOption,
    activeFilters, setActiveFilters,
    availableGenres, availableEditions,
    
    clearFilters, filteredSongsLength, totalSongsLength
}) => {
    const { t } = useTranslation();
    const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);

    const handleSortClick = (event: React.MouseEvent<HTMLElement>) => {
        setSortAnchor(event.currentTarget);
    };

    const handleSortClose = () => {
        setSortAnchor(null);
    };

    const handleSelectSort = (opt: SortOption) => {
        setSortOption?.(opt);
        setSortAnchor(null);
    };

    return (
        <Box sx={{ flexShrink: 0 }}>
            <Box sx={{
                bgcolor: 'background.paper',
                pl: { xs: 2, sm: 3 },
                pr: { xs: 1, sm: 1.5 },
                py: 1,
                mb: showFilters ? 0 : 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
            }}>
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
                                <IconButton 
                                    onClick={() => setIsOnlineSearch(!isOnlineSearch)} 
                                    color={isOnlineSearch ? "primary" : "default"}
                                    title="Search Online"
                                    size="small"
                                >
                                    <PublicIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        )
                    }}
                    sx={{
                        flexGrow: 1,
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 50,
                            bgcolor: 'rgba(255,255,255,0.08)',
                            height: 40,
                        }
                    }}
                />

                {setSortOption && (
                    <>
                        <IconButton
                            onClick={handleSortClick}
                            color={sortOption && sortOption !== 'title-asc' ? 'primary' : 'inherit'}
                            size="large"
                            title={t('melodiq.sort_by')}
                            sx={{ flexShrink: 0 }}
                        >
                            <SortIcon />
                        </IconButton>
                        <Menu
                            anchorEl={sortAnchor}
                            open={Boolean(sortAnchor)}
                            onClose={handleSortClose}
                            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                        >
                            <MenuItem selected={sortOption === 'title-asc'} onClick={() => handleSelectSort('title-asc')}>
                                {t('melodiq.sort_title_asc')}
                            </MenuItem>
                            <MenuItem selected={sortOption === 'title-desc'} onClick={() => handleSelectSort('title-desc')}>
                                {t('melodiq.sort_title_desc')}
                            </MenuItem>
                            <MenuItem selected={sortOption === 'artist-asc'} onClick={() => handleSelectSort('artist-asc')}>
                                {t('melodiq.sort_artist_asc')}
                            </MenuItem>
                            <MenuItem selected={sortOption === 'artist-desc'} onClick={() => handleSelectSort('artist-desc')}>
                                {t('melodiq.sort_artist_desc')}
                            </MenuItem>
                            <MenuItem selected={sortOption === 'year-desc'} onClick={() => handleSelectSort('year-desc')}>
                                {t('melodiq.sort_year_desc')}
                            </MenuItem>
                            <MenuItem selected={sortOption === 'year-asc'} onClick={() => handleSelectSort('year-asc')}>
                                {t('melodiq.sort_year_asc')}
                            </MenuItem>
                        </Menu>
                    </>
                )}

                <IconButton
                    onClick={() => setShowFilters(prev => !prev)}
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

                    <FormControl size="small" sx={{ minWidth: 120, maxWidth: 200 }}>
                        <InputLabel>{t('melodiq.genre')}</InputLabel>
                        <Select
                            multiple
                            value={activeFilters.genre}
                            label={t('melodiq.genre')}
                            onChange={(e) => {
                                const value = e.target.value;
                                setActiveFilters(prev => ({
                                    ...prev,
                                    genre: typeof value === 'string' ? value.split(',') : value
                                }));
                            }}
                            renderValue={(selected) => selected.join(', ')}
                            sx={{ borderRadius: 50 }}
                        >
                            {availableGenres.map(g => (
                                <MenuItem key={g} value={g}>
                                    <Checkbox checked={activeFilters.genre.indexOf(g) > -1} />
                                    <ListItemText primary={g} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 150, maxWidth: 250 }}>
                        <InputLabel>{t('melodiq.edition')}</InputLabel>
                        <Select
                            multiple
                            value={activeFilters.edition}
                            label={t('melodiq.edition')}
                            onChange={(e) => {
                                const value = e.target.value;
                                setActiveFilters(prev => ({
                                    ...prev,
                                    edition: typeof value === 'string' ? value.split(',') : value
                                }));
                            }}
                            renderValue={(selected) => selected.join(', ')}
                            sx={{ borderRadius: 50 }}
                        >
                            {availableEditions.map(ed => (
                                <MenuItem key={ed} value={ed}>
                                    <Checkbox checked={activeFilters.edition.indexOf(ed) > -1} />
                                    <ListItemText primary={ed} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {(activeFilters.year.length > 0 || activeFilters.genre.length > 0 || activeFilters.language.length > 0 || activeFilters.edition.length > 0) && (
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
