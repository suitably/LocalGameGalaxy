import React from 'react';
import { Dialog, DialogTitle, DialogContent, Button, Typography, Box } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useClientEngine } from '../PhoneClientEngine';

export const PhoneJoinPrompt: React.FC = () => {
    const { 
        isSessionPlaying,
        activeSongId: contextActiveSongId,
        promptedSongId, 
        setPromptedSongId, 
        setClientRole, 
        updateClientProfile, 
        sendClientCommand 
    } = useClientEngine();

    // Only show if the game is playing, and we haven't prompted for this song yet.
    const activeSongId = contextActiveSongId || 'unknown';
    const open = isSessionPlaying && promptedSongId !== activeSongId;

    const handleChoice = (mode: 'singer' | 'spectator') => {
        setClientRole(mode);
        if (mode === 'spectator') {
            updateClientProfile({ displayMode: 'lyrics' });
        } else {
            updateClientProfile({ displayMode: 'self' });
        }
        sendClientCommand('session.join_mode', { mode });
        setPromptedSongId(activeSongId);
    };

    if (!open) return null;

    return (
        <Dialog 
            open={open} 
            PaperProps={{ sx: { bgcolor: 'rgba(20,20,30,0.95)', color: 'white' } }}
            sx={{ zIndex: 1400 }}
        >
            <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>Session in Progress</DialogTitle>
            <DialogContent>
                <Typography sx={{ mb: 3, textAlign: 'center' }}>
                    A song is currently playing. How would you like to join?
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        size="large"
                        startIcon={<MicIcon />}
                        onClick={() => handleChoice('singer')}
                    >
                        Join as Singer
                    </Button>
                    <Button 
                        variant="outlined" 
                        color="inherit" 
                        size="large"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleChoice('spectator')}
                    >
                        Just Spectate
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
};
