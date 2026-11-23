import React, { useState } from 'react';
import { melodiqFetch } from '../api/melodiqFetch';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Avatar,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import SearchIcon from '@mui/icons-material/SearchRounded';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import { ErrorState } from '../../../components/common/ErrorState';
import { ListSkeleton } from '../../../components/common/ListSkeleton';

interface YouTubeResult {
  id: string;
  title: string;
  duration: number;
  duration_string: string;
  uploader: string;
  url: string;
  thumbnail: string;
}

const isDirectUrl = (q: string) => q.startsWith('http://') || q.startsWith('https://');

interface YouTubeSearchDialogProps {
  open: boolean;
  onClose: () => void;
  initialQuery: string;
  onSelectUrl: (url: string, skipAudio: boolean) => void;
}

export const YouTubeSearchDialog: React.FC<YouTubeSearchDialogProps> = ({
  open,
  onClose,
  initialQuery,
  onSelectUrl,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<YouTubeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [skipAudio, setSkipAudio] = useState<boolean>(false);

  // Reset the search form when the dialog opens or the initial query changes (adjusted during render).
  const [prevSource, setPrevSource] = useState({ open, initialQuery });
  if (prevSource.open !== open || prevSource.initialQuery !== initialQuery) {
    setPrevSource({ open, initialQuery });
    if (open) {
      setQuery(initialQuery);
      setResults([]);
      setSelectedUrl('');
      setError(null);
      // Auto search when opening with an initial query: URLs are selected directly,
      // anything else starts loading (the fetch itself runs in the effect below).
      if (isDirectUrl(initialQuery)) setSelectedUrl(initialQuery);
      else if (initialQuery.trim()) setLoading(true);
    }
  }

  const handleSearch = async (overrideQuery?: string) => {
    const q = overrideQuery || query;
    if (!q.trim()) return;

    if (isDirectUrl(q)) {
      setSelectedUrl(q);
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await melodiqFetch(`/api/youtube/search?q=${encodeURIComponent(q)}&limit=5`);
      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (open && initialQuery.trim() && !isDirectUrl(initialQuery)) {
      melodiqFetch(`/api/youtube/search?q=${encodeURIComponent(initialQuery)}&limit=5`)
        .then((data) => setResults(data))
        .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
        .finally(() => setLoading(false));
    }
  }, [open, initialQuery]);

  const handleConfirm = () => {
    if (selectedUrl) {
      onSelectUrl(selectedUrl, skipAudio);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('melodiq.youtube_dialog.title')}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('melodiq.youtube_dialog.description')}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={t('melodiq.youtube_dialog.placeholder')}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.startsWith('http')) {
                setSelectedUrl(e.target.value);
              }
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => handleSearch()}
                    disabled={loading}
                    aria-label={t('melodiq.youtube_dialog.search')}
                  >
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {loading ? (
          <ListSkeleton rows={4} rowHeight={45} />
        ) : error ? (
          <ErrorState dense message={error} onRetry={() => handleSearch()} />
        ) : results.length > 0 ? (
          <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 2 }}>
            {results.map((result) => (
              <ListItem key={result.id} disablePadding>
                <ListItemButton
                  selected={selectedUrl === result.url}
                  onClick={() => setSelectedUrl(result.url)}
                  sx={{ borderRadius: 2, mb: 0.5 }}
                >
                  <ListItemAvatar>
                    <Avatar
                      variant="rounded"
                      src={result.thumbnail}
                      sx={{ width: 80, height: 45, mr: 2 }}
                    >
                      <PlayArrowIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={result.title}
                    primaryTypographyProps={{ variant: 'subtitle2', noWrap: true }}
                    secondary={`${result.uploader} • ${result.duration_string}`}
                  />
                  {selectedUrl === result.url && <CheckCircleIcon color="primary" />}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        ) : query.startsWith('http') ? (
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="body1">{t('melodiq.youtube_dialog.valid_url')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
              {selectedUrl}
            </Typography>
          </Box>
        ) : null}

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={skipAudio}
                onChange={(e) => setSkipAudio(e.target.checked)}
                color="primary"
              />
            }
            label={t('melodiq.youtube_dialog.skip_audio')}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t('common.cancel')}
        </Button>
        <Button onClick={handleConfirm} variant="contained" color="primary" disabled={!selectedUrl}>
          {t('melodiq.youtube_dialog.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
