import React from 'react';
import { Box, Typography, Button, IconButton, List, ListItem, ListItemText, ListItemAvatar, Avatar, Paper } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useTranslation } from 'react-i18next';
import { type SongMeta } from '../db';

interface QueueListProps {
    nowPlaying: SongMeta | null;
    queue: any[];
    clearQueue: () => void;
    removeFromQueue: (id: string) => void;
    moveItem: (oldIndex: number, newIndex: number) => void;
}

export const QueueList: React.FC<QueueListProps> = ({
    nowPlaying,
    queue,
    clearQueue,
    removeFromQueue,
    moveItem
}) => {
    const { t } = useTranslation();

    const handleMove = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index > 0) {
            moveItem(index, index - 1);
        } else if (direction === 'down' && index < queue.length - 1) {
            moveItem(index, index + 1);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {nowPlaying && (
                <Paper sx={{ p: 2, mb: 4, bgcolor: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.3)' }}>
                    <Typography variant="overline" color="success.main" fontWeight="bold">{t('melodiq.now_playing')}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                        <Avatar sx={{ bgcolor: 'success.main' }}>
                            <MusicNoteIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="h6">{nowPlaying.title}</Typography>
                            <Typography variant="body2" color="text.secondary">{nowPlaying.artist}</Typography>
                        </Box>
                    </Box>
                </Paper>
            )}

            <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">{t('melodiq.up_next', { count: queue.length })}</Typography>
                {queue.length > 0 && (
                    <Button
                        size="small"
                        color="error"
                        onClick={clearQueue}
                        startIcon={<DeleteIcon />}
                        variant="outlined"
                        sx={{ borderRadius: 50 }}
                    >
                        {t('melodiq.clear_all')}
                    </Button>
                )}
            </Paper>

            <Box sx={{
                overflow: 'auto',
                bgcolor: 'background.paper',
                borderRadius: 1,
                maxHeight: { xs: '30vh', md: 'none' },
                flexGrow: 1
            }}>
                <List>
                    {queue.map((item, index) => (
                        <ListItem
                            key={item.id}
                            secondaryAction={
                                <Box>
                                    <IconButton edge="end" aria-label="up" onClick={() => handleMove(index, 'up')} disabled={index === 0}>
                                        <ArrowUpwardIcon />
                                    </IconButton>
                                    <IconButton edge="end" aria-label="down" onClick={() => handleMove(index, 'down')} disabled={index === queue.length - 1}>
                                        <ArrowDownwardIcon />
                                    </IconButton>
                                    <IconButton edge="end" aria-label="delete" onClick={() => removeFromQueue(item.id)} color="error">
                                        <DeleteIcon />
                                    </IconButton>
                                </Box>
                            }
                        >
                            <ListItemAvatar>
                                <Avatar>
                                    <MusicNoteIcon />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={item.song.title}
                                secondary={`${item.song.artist} ${item.requester ? `(Requested by ${item.requester})` : ''} ${item.song.isDownloading ? '- Downloading...' : ''}`}
                            />
                        </ListItem>
                    ))}
                    {queue.length === 0 && (
                        <Box sx={{ p: 4, textAlign: 'center', opacity: 0.6 }}>
                            <Typography>{t('melodiq.queue_empty')}</Typography>
                        </Box>
                    )}
                </List>
            </Box>
        </Box>
    );
};
