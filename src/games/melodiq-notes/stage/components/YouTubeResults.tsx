import {
  Avatar,
  IconButton,
  InputAdornment,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/SearchRounded';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { searchYouTube, type YouTubeResult } from '../../../../lib/companion/songDownloadApi';

const isUrl = (text: string) => /^https?:\/\//.test(text.trim());
const canSearch = (q: string) => !!q.trim() && !isUrl(q);

interface YouTubeResultsProps {
  initialQuery: string;
  selected: string | null;
  onSelect: (url: string | null) => void;
  disabled: boolean;
}

/** Search YouTube through the companion server (yt-dlp), or paste a link. */
export function YouTubeResults({
  initialQuery,
  selected,
  onSelect,
  disabled,
}: YouTubeResultsProps) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<YouTubeResult[] | null>(null);
  const [searching, setSearching] = useState(() => canSearch(initialQuery));
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback((q: string) => {
    searchYouTube(q.trim())
      .then(setResults)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setSearching(false));
  }, []);

  const search = (q: string) => {
    if (!canSearch(q)) return;
    setSearching(true);
    setError(null);
    fetchResults(q);
  };

  // search right away for the piece on stage (the list is mounted once per dialog opening)
  useEffect(() => {
    if (canSearch(initialQuery)) fetchResults(initialQuery);
  }, [initialQuery, fetchResults]);

  return (
    <Stack spacing={1}>
      <TextField
        size="small"
        fullWidth
        label={k('yt_search')}
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          onSelect(isUrl(e.target.value) ? e.target.value.trim() : null);
        }}
        onKeyDown={(e) => e.key === 'Enter' && search(query)}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={k('yt_search')}
                disabled={searching || disabled}
                onClick={() => search(query)}
              >
                <SearchIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      {searching && <Typography variant="body2">{k('loading')}</Typography>}
      {error && (
        <Typography variant="body2" color="error">
          {k('yt_search_error', { error })}
        </Typography>
      )}
      {results?.length === 0 && !searching && (
        <Typography variant="body2" color="text.secondary">
          {k('yt_no_results')}
        </Typography>
      )}
      {results && results.length > 0 && !isUrl(query) && (
        <List dense disablePadding>
          {results.map((r) => (
            <ListItemButton
              key={r.id}
              selected={selected === r.url}
              disabled={disabled}
              onClick={() => onSelect(r.url)}
              sx={{ borderRadius: 1 }}
            >
              <ListItemAvatar>
                <Avatar variant="rounded" src={r.thumbnail} sx={{ width: 64, height: 36, mr: 1 }} />
              </ListItemAvatar>
              <ListItemText
                primary={r.title}
                primaryTypographyProps={{ noWrap: true }}
                secondary={`${r.uploader} · ${r.duration_string}`}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Stack>
  );
}
