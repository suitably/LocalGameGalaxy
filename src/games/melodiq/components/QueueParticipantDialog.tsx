import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, List, ListItem, ListItemAvatar, Avatar, ListItemText, Switch, Button, DialogActions, Box, Typography } from '@mui/material';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useQueue } from '../hooks/useQueue';
import { useWebRTC } from '../audio/WebRTCContext';

interface QueueParticipantDialogProps {
    open: boolean;
    onClose: () => void;
    queueItemId: string | null;
}

export const QueueParticipantDialog: React.FC<QueueParticipantDialogProps> = ({ open, onClose, queueItemId }) => {
    const { t } = useTranslation();
    const { queue, toggleQueueParticipant, reorderQueueParticipant } = useQueue();
    const { activePeers } = useWebRTC();

    const item = queue.find((q) => q.id === queueItemId);
    
    // Combine local profiles and connected remote peers
    const storedProfiles = localStorage.getItem('melodiq_profiles');
    const localProfiles = storedProfiles ? JSON.parse(storedProfiles) : [];
    const remoteProfiles = activePeers.map(peer => ({
        id: peer.deviceId || peer.peerId, // Prefer deviceId to match what is stored in queue participants
        peerId: peer.peerId,
        name: peer.name,
        hue: peer.hue || 0,
        isRemote: true
    }));
    
    // Explicitly add the bot so it can be toggled
    const botProfile = { id: 'BOT', name: 'Bot Player', hue: 330, isRemote: false };
    const allProfiles = [botProfile, ...localProfiles, ...remoteProfiles];

    if (!item) return null;

    const participants = item.participants || [];
    
    // Identify which profiles are not currently participating
    const nonParticipatingProfiles = allProfiles.filter(profile => {
        const isParticipating = !!participants.find((p: any) => 
            p.profileId === profile.id || p.deviceId === profile.id || (profile.peerId && p.deviceId === profile.peerId)
        );
        return !isParticipating;
    });

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        if (result.destination.index === result.source.index) return;
        if (!reorderQueueParticipant) return;
        reorderQueueParticipant(item.id, result.source.index, result.destination.index);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Manage Participants</DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
                <Box sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="overline" color="text.secondary">Active Singers (Drag to reorder Player 1 / Player 2)</Typography>
                </Box>
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="participants-list">
                        {(provided) => {
                            const storedMicSlots = JSON.parse(localStorage.getItem('melodiq_mic_slots') || '[]');
                            const storedMicNames = JSON.parse(localStorage.getItem('melodiq_mic_names') || '{}');
                            const storedOriginalNames = JSON.parse(localStorage.getItem('melodiq_mic_original_names') || '{}');

                            return (
                                <List {...provided.droppableProps} ref={provided.innerRef} sx={{ pt: 0 }}>
                                    {participants.map((p: any, index: number) => {
                                    const isLocalHuman = !p.isRemote && p.profileId !== 'BOT';
                                    let localSlotIndex = -1;
                                    if (isLocalHuman) {
                                        localSlotIndex = participants.slice(0, index).filter((prevP: any) => !prevP.isRemote && prevP.profileId !== 'BOT').length;
                                    }
                                    
                                    let secondaryText = p.isRemote ? '📱 Phone Client' : (p.profileId === 'BOT' ? '🤖 Bot Player' : '👤 Local User');
                                    
                                    if (isLocalHuman) {
                                        const deviceId = storedMicSlots[localSlotIndex];
                                        const customName = deviceId ? storedMicNames[deviceId] : null;
                                        const originalName = deviceId ? storedOriginalNames[deviceId] : null;

                                        if (customName) {
                                            secondaryText = `🎤 ${customName}`;
                                        } else if (originalName) {
                                            secondaryText = `🎤 ${originalName}`;
                                        } else {
                                            secondaryText = `🎤 Mic ${localSlotIndex + 1}`;
                                        }
                                    }

                                    return (
                                        <Draggable key={p.profileId || p.deviceId || `temp-${index}`} draggableId={p.profileId || p.deviceId || `temp-${index}`} index={index}>
                                            {(provided, snapshot) => (
                                                <ListItem
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    sx={{
                                                        bgcolor: snapshot.isDragging ? 'action.selected' : 'inherit',
                                                        ...provided.draggableProps.style
                                                    }}
                                                >
                                                    <Box {...provided.dragHandleProps} sx={{ mr: 2, display: 'flex', alignItems: 'center', color: 'action.active' }}>
                                                        <DragHandleIcon />
                                                    </Box>
                                                    <ListItemAvatar>
                                                        <Avatar sx={{ bgcolor: `hsl(${p.hue || 0}, 80%, 40%)` }}>
                                                            {p.name ? p.name.charAt(0).toUpperCase() : '?'}
                                                        </Avatar>
                                                    </ListItemAvatar>
                                                    <ListItemText 
                                                        primary={p.name || 'Unknown'} 
                                                        secondary={secondaryText} 
                                                    />
                                                    <Switch
                                                        edge="end"
                                                        checked={true}
                                                        onChange={() => {
                                                            // Toggle off
                                                            toggleQueueParticipant(item.id, p.profileId || p.deviceId, p);
                                                        }}
                                                    />
                                                </ListItem>
                                            )}
                                        </Draggable>
                                    );
                                })}
                                {provided.placeholder}
                            </List>
                        );
                    }}
                    </Droppable>
                </DragDropContext>

                {nonParticipatingProfiles.length > 0 && (
                    <>
                        <Box sx={{ p: 2, bgcolor: 'background.default' }}>
                            <Typography variant="overline" color="text.secondary">Available Profiles</Typography>
                        </Box>
                        <List sx={{ pt: 0 }}>
                            {nonParticipatingProfiles.map((profile) => (
                                <ListItem key={profile.id}>
                                    <Box sx={{ width: 40 }} /> {/* Spacer for drag handle alignment */}
                                    <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: `hsl(${profile.hue || 0}, 80%, 40%)` }}>
                                            {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText primary={profile.name} secondary={profile.id === 'BOT' ? 'Bot Player' : (profile as any).isRemote ? 'Phone Client' : 'Local User'} />
                                    <Switch
                                        edge="end"
                                        checked={false}
                                        onChange={() => toggleQueueParticipant(item.id, profile.id, profile)}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('common.close')}</Button>
            </DialogActions>
        </Dialog>
    );
};
