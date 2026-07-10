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
    CircularProgress,
    List,
    ListItem,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    Avatar,
    InputAdornment,
    IconButton,
    FormControlLabel,
    Checkbox
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface YouTubeResult {
    id: string;
    title: string;
    duration: number;
    duration_string: string;
    uploader: string;
    url: string;
    thumbnail: string;
}

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
    onSelectUrl
}) => {
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<YouTubeResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedUrl, setSelectedUrl] = useState<string>('');
    const [skipAudio, setSkipAudio] = useState<boolean>(false);

    React.useEffect(() => {
        if (open) {
            setQuery(initialQuery);
            setResults([]);
            setSelectedUrl('');
            setError(null);
            
            if (initialQuery) {
                // Auto search when opening with initial query
                handleSearch(initialQuery);
            }
        }
    }, [open, initialQuery]);

    const handleSearch = async (overrideQuery?: string) => {
        const q = overrideQuery || query;
        if (!q.trim()) return;

        if (q.startsWith('http://') || q.startsWith('https://')) {
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

    const handleConfirm = () => {
        if (selectedUrl) {
            onSelectUrl(selectedUrl, skipAudio);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Change Video / Audio</DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Search for a new YouTube video, or paste a direct YouTube URL to replace the media for this song.
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Search or Paste URL..."
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
                                    <IconButton onClick={() => handleSearch()} disabled={loading}>
                                        <SearchIcon />
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Typography color="error" variant="body2">{error}</Typography>
                ) : results.length > 0 ? (
                    <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 1 }}>
                        {results.map((result) => (
                            <ListItem key={result.id} disablePadding>
                                <ListItemButton
                                    selected={selectedUrl === result.url}
                                    onClick={() => setSelectedUrl(result.url)}
                                    sx={{ borderRadius: 1, mb: 0.5 }}
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
                                    {selectedUrl === result.url && (
                                        <CheckCircleIcon color="primary" />
                                    )}
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                ) : query.startsWith('http') ? (
                    <Box sx={{ py: 2, textAlign: 'center' }}>
                        <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="body1">Valid URL detected</Typography>
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
                        label="Nur Video ersetzen (Audio behalten)"
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button 
                    onClick={handleConfirm} 
                    variant="contained" 
                    color="primary"
                    disabled={!selectedUrl}
                >
                    Download & Replace
                </Button>
            </DialogActions>
        </Dialog>
    );
};
