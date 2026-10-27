import {
  Button,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/CloseRounded';
import SearchIcon from '@mui/icons-material/SearchRounded';
import { useTranslation } from 'react-i18next';
import { MultiFilterSelect } from '../../../../components/common/MultiFilterSelect';
import {
  activeFilterCount,
  toggleValue,
  type CatalogFacets,
  type CatalogSort,
} from '../logic/catalogSearch';
import type { CatalogSearchState } from '../useCatalogSearch';

const SORTS: CatalogSort[] = ['artist', 'title', 'year'];

interface ChipGroupProps<T extends string> {
  label: string;
  options: readonly T[];
  selected: readonly T[];
  name: (value: T) => string;
  onChange: (next: T[]) => void;
}

/** A facet as one row of toggle chips (scrolls sideways on a phone); several can be on. */
function ChipGroup<T extends string>({
  label,
  options,
  selected,
  name,
  onChange,
}: ChipGroupProps<T>) {
  if (options.length === 0) return null;
  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      role="group"
      aria-label={label}
      sx={{ overflowX: 'auto', pb: 0.25, '& > *': { flexShrink: 0 } }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 72 }}>
        {label}
      </Typography>
      {options.map((value) => {
        const on = selected.includes(value);
        return (
          <Chip
            key={value}
            size="small"
            label={name(value)}
            color={on ? 'primary' : 'default'}
            variant={on ? 'filled' : 'outlined'}
            aria-pressed={on}
            onClick={() => onChange(toggleValue(selected, value))}
          />
        );
      })}
    </Stack>
  );
}

interface CatalogSearchBarProps {
  search: CatalogSearchState;
  facets: CatalogFacets;
  resultCount: number;
}

/** Search field, facet chips (format, instrument), language/genre dropdowns and sort order. */
export function CatalogSearchBar({ search, facets, resultCount }: CatalogSearchBarProps) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const { filters: f, update, reset } = search;
  return (
    <Stack spacing={1}>
      <TextField
        size="small"
        fullWidth
        type="search"
        label={k('search')}
        value={f.query}
        onChange={(e) => update({ query: e.target.value })}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: f.query ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label={k('search_clear')}
                  onClick={() => update({ query: '' })}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          },
        }}
      />
      <ChipGroup
        label={k('filter_format')}
        options={facets.formats}
        selected={f.formats}
        name={(v) => k(`formats.${v}`)}
        onChange={(formats) => update({ formats })}
      />
      <ChipGroup
        label={k('filter_instrument')}
        options={facets.instruments}
        selected={f.instruments}
        name={(v) => k(`instruments.${v}`)}
        onChange={(instruments) => update({ instruments })}
      />
      <Stack direction="row" spacing={1} alignItems="center" sx={{ overflowX: 'auto', pt: 0.75 }}>
        {facets.languages.length > 1 && (
          <MultiFilterSelect
            label={k('filter_language')}
            options={facets.languages}
            value={f.languages}
            onChange={(languages) => update({ languages })}
            minWidth={108}
            maxWidth={160}
          />
        )}
        {facets.genres.length > 1 && (
          <MultiFilterSelect
            label={k('filter_genre')}
            options={facets.genres}
            value={f.genres}
            onChange={(genres) => update({ genres })}
            minWidth={108}
            maxWidth={160}
          />
        )}
        <TextField
          select
          size="small"
          label={k('sort_label')}
          value={f.sort}
          onChange={(e) => update({ sort: e.target.value as CatalogSort })}
          sx={{
            minWidth: 120,
            flexShrink: 0,
            '& .MuiOutlinedInput-root': { borderRadius: 999 },
          }}
        >
          {SORTS.map((s) => (
            <MenuItem key={s} value={s}>
              {k(`sort.${s}`)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ minHeight: 30 }}>
        <Typography variant="caption" color="text.secondary" role="status" sx={{ flexGrow: 1 }}>
          {k('results', { count: resultCount })}
        </Typography>
        {activeFilterCount(f) > 0 && (
          <Button size="small" onClick={reset}>
            {k('filters_reset')}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
