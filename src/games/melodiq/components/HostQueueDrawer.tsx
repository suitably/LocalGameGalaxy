import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Drawer, Box, Typography, IconButton, List, ListItem,
    ListItemText, ListItemAvatar, Avatar, Button, Badge, Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import { useQueue } from '../hooks/useQueue';
import { useClientEngine } from '../PhoneClientEngine';
import { QueueParticipantDialog } from './QueueParticipantDialog';
import { HistoryDrawer } from './HistoryDrawer';

interface HostQueueDrawerProps {
    open: boolean;
    onClose: () => void;
}

export const HostQueueDrawer: React.FC<HostQueueDrawerProps> = ({ open, onClose }) => {
    const { t } = useTranslation();
    const { queue, nowPlaying, removeFromQueue, moveItem, clearQueue, toggleQueueParticipant } = useQueue();
    const { clientRole, clientProfile } = useClientEngine();
    const isClient = new URLSearchParams(window.location.search).get('role') === 'client';
    
    const canManageQueue = !isClient || clientRole === 'admin' || clientRole === 'queue_manager';

    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const dragItemRef = useRef<number | null>(null);
    const [manageParticipantsId, setManageParticipantsId] = useState<string | null>(null);
    const [historyOpen, setHistoryOpen] = useState(false);

    const handleDragStart = useCallback((index: number) => {
        dragItemRef.current = index;
        setDragIndex(index);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
        e.preventDefault();
        const fromIndex = dragItemRef.current;
        if (fromIndex !== null && fromIndex !== toIndex) {
            moveItem(fromIndex, toIndex);
        }
        setDragIndex(null);
        setDragOverIndex(null);
        dragItemRef.current = null;
    }, [moveItem]);

    const handleDragEnd = useCallback(() => {
        setDragIndex(null);
        setDragOverIndex(null);
        dragItemRef.current = null;
    }, []);

    return (
        <Drawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    maxHeight: '70vh',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    bgcolor: 'rgba(20, 20, 30, 0.98)',
                    display: 'flex',
                    flexDirection: 'column',
                }
            }}
            slotProps={{
                backdrop: {
                    sx: { bgcolor: 'rgba(0, 0, 0, 0.5)' }
                }
            }}
        >
            {/* Drag indicator */}
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
                <Box sx={{
                    width: 40, height: 4,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.3)',
                }} />
            </Box>

            {/* Header */}
            <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                px: 2.5, py: 1.5, flexShrink: 0,
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <PlaylistPlayIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">{t('melodiq.queue')}</Typography>
                    {queue.length > 0 && (
                        <Badge
                            badgeContent={queue.length}
                            color="primary"
                            sx={{ ml: 0.5 }}
                        />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {queue.length > 0 && canManageQueue && (
                        <Button
                            size="small"
                            color="error"
                            onClick={clearQueue}
                            startIcon={<DeleteSweepIcon />}
                            sx={{ borderRadius: 50, textTransform: 'none', mr: 1 }}
                        >
                            Clear
                        </Button>
                    )}
                    <IconButton onClick={() => setHistoryOpen(true)} size="small" sx={{ color: 'grey.400' }}>
                        <HistoryIcon />
                    </IconButton>
                    <IconButton onClick={onClose} size="small" sx={{ color: 'grey.400' }}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

            {/* Scrollable content */}
            <Box sx={{ overflow: 'auto', flexGrow: 1, pb: 2 }}>
                {/* Now Playing */}
                {nowPlaying && (
                    <Box sx={{
                        px: 2.5, py: 2,
                        bgcolor: 'rgba(76, 175, 80, 0.08)',
                        borderBottom: '1px solid rgba(76, 175, 80, 0.2)',
                    }}>
                        <Typography
                            variant="overline"
                            sx={{ color: 'success.main', fontWeight: 'bold', letterSpacing: 1.5 }}
                        >
                            Now Playing
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                            <Avatar sx={{
                                bgcolor: 'success.main',
                                width: 44, height: 44,
                                boxShadow: '0 0 12px rgba(76, 175, 80, 0.4)',
                            }}>
                                <MusicNoteIcon />
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle1" fontWeight="bold" noWrap>
                                    {nowPlaying.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" noWrap>
                                    {nowPlaying.artist}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                )}

                {/* Up Next */}
                <Box sx={{ px: 2.5, pt: 2, pb: 0.5 }}>
                    <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.5 }}>
                        Up Next · {queue.length} {queue.length === 1 ? 'song' : 'songs'}
                    </Typography>
                </Box>

                {queue.length === 0 ? (
                    <Box sx={{ px: 2.5, py: 6, textAlign: 'center' }}>
                        <PlaylistPlayIcon sx={{ fontSize: 48, color: 'grey.700', mb: 1 }} />
                        <Typography color="text.secondary">
                            Queue is empty
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.6, mt: 0.5 }}>
                            Long-press a song to add it to the queue
                        </Typography>
                    </Box>
                ) : (
                    <List disablePadding>
                        {queue.map((item, index) => (
                            <ListItem
                                key={item.id}
                                draggable={canManageQueue}
                                onDragStart={(e) => {
                                    if (canManageQueue) handleDragStart(index);
                                }}
                                onDragOver={(e) => {
                                    if (canManageQueue) handleDragOver(e, index);
                                }}
                                onDrop={(e) => {
                                    if (canManageQueue) handleDrop(e, index);
                                }}
                                onDragEnd={handleDragEnd}
                                sx={{
                                    px: 2.5,
                                    py: 1,
                                    cursor: canManageQueue ? 'grab' : 'default',
                                    transition: 'all 0.15s ease',
                                    opacity: dragIndex === index ? 0.4 : 1,
                                    bgcolor: dragOverIndex === index
                                        ? 'rgba(144, 202, 249, 0.08)'
                                        : 'transparent',
                                    borderTop: dragOverIndex === index
                                        ? '2px solid rgba(144, 202, 249, 0.5)'
                                        : '2px solid transparent',
                                    '&:hover': {
                                        bgcolor: 'rgba(255,255,255,0.04)',
                                    },
                                    '&:active': {
                                        cursor: 'grabbing',
                                    },
                                }}
                            >
                                {/* Drag Handle */}
                                {canManageQueue && (
                                    <Box sx={{
                                        display: 'flex', alignItems: 'center', mr: 1.5,
                                        color: 'grey.600', cursor: 'grab',
                                    }}>
                                        <DragHandleIcon fontSize="small" />
                                    </Box>
                                )}

                                {/* Position number */}
                                <Typography
                                    variant="body2"
                                    sx={{ color: 'grey.500', minWidth: 24, textAlign: 'center', mr: 1.5 }}
                                >
                                    {index + 1}
                                </Typography>

                                <ListItemAvatar sx={{ minWidth: 40 }}>
                                    <Avatar sx={{ width: 36, height: 36, bgcolor: 'grey.800' }}>
                                        <MusicNoteIcon fontSize="small" />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={item.song.title}
                                    secondary={
                                        item.requester
                                            ? `${item.song.artist} · by ${item.requester}`
                                            : item.song.artist
                                    }
                                    primaryTypographyProps={{
                                        noWrap: true, fontWeight: 500, fontSize: '0.95rem',
                                    }}
                                    secondaryTypographyProps={{
                                        noWrap: true, fontSize: '0.8rem', color: 'grey.500',
                                    }}
                                    sx={{ mr: 2, flex: 1 }}
                                />

                                {/* Participants and Join Button */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {item.participants && item.participants.length > 0 ? (
                                        <Box sx={{ display: 'flex', mr: 1 }}>
                                            {item.participants.map((p: any, i: number) => (
                                                <Avatar
                                                    key={i}
                                                    sx={{
                                                        width: 24, height: 24, fontSize: '0.7rem',
                                                        bgcolor: `hsl(${p.hue || 0}, 80%, 40%)`,
                                                        border: '2px solid rgba(20, 20, 30, 0.98)',
                                                        ml: i > 0 ? -1 : 0
                                                    }}
                                                >
                                                    {p.name ? p.name.charAt(0).toUpperCase() : '?'}
                                                </Avatar>
                                            ))}
                                        </Box>
                                    ) : null}

                                    {isClient && (
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleQueueParticipant(item.id, clientProfile.deviceId, clientProfile);
                                            }}
                                            sx={{
                                                bgcolor: item.participants?.find((p: any) => p.deviceId === clientProfile.deviceId) ? 'primary.main' : 'rgba(255,255,255,0.1)',
                                                color: 'white',
                                                '&:hover': {
                                                    bgcolor: item.participants?.find((p: any) => p.deviceId === clientProfile.deviceId) ? 'primary.dark' : 'rgba(255,255,255,0.2)',
                                                }
                                            }}
                                        >
                                            {item.participants?.find((p: any) => p.deviceId === clientProfile.deviceId) ? (
                                                <MicIcon fontSize="small" />
                                            ) : (
                                                <MicOffIcon fontSize="small" />
                                            )}
                                        </IconButton>
                                    )}
                                    {!isClient && (
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setManageParticipantsId(item.id);
                                            }}
                                            sx={{ color: 'grey.500', '&:hover': { color: 'white' } }}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                    
                                    {(!isClient || canManageQueue || (clientRole === 'queue_contributor' && item.requesterId === clientProfile.deviceId)) && (
                                        <IconButton
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeFromQueue(item.id);
                                            }}
                                            size="small"
                                            sx={{ color: 'grey.500', '&:hover': { color: 'error.main' } }}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </Box>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Box>
            
            <QueueParticipantDialog
                open={!!manageParticipantsId}
                onClose={() => setManageParticipantsId(null)}
                queueItemId={manageParticipantsId}
            />

            <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />
        </Drawer>
    );
};
