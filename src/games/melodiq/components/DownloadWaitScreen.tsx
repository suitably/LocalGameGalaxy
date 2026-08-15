import React from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import { ScoreBoardQrCode } from '../gameplay/ScoreBoardQrCode';

interface DownloadWaitScreenProps {
    songTitle: string;
    artist: string;
    onSkipAndRequeue: () => void;
}

export const DownloadWaitScreen: React.FC<DownloadWaitScreenProps> = ({ songTitle, artist, onSkipAndRequeue }) => {
    return (
        <Box sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
            color: 'text.primary',
            p: 3,
            gap: 3,
            overflow: 'auto'
        }}>
            <CircularProgress size={70} thickness={4} sx={{ color: 'primary.main' }} />
            
            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Warte auf Download...
                </Typography>
                <Typography variant="h5" color="text.secondary">
                    {artist} - {songTitle}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5, opacity: 0.8 }}>
                    Der Song wird im Hintergrund heruntergeladen und startet automatisch, sobald er bereit ist.
                </Typography>
            </Box>

            <Button 
                variant="outlined" 
                size="large"
                startIcon={<SkipNextIcon />}
                onClick={onSkipAndRequeue}
                sx={{
                    borderRadius: 4,
                    px: 4,
                    py: 1.25,
                    borderWidth: 2,
                    '&:hover': {
                        borderWidth: 2,
                    }
                }}
            >
                Überspringen & für später einreihen
            </Button>

            <ScoreBoardQrCode sx={{ maxWidth: 450, width: '100%', mt: 1 }} />
        </Box>
    );
};
