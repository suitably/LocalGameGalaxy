import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useTranslation } from 'react-i18next';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';

interface GameTimerProps {
    timerLength: number; // in seconds
    onTimeUp: () => void;
    onEndEarly: () => void;
}

export const GameTimer: React.FC<GameTimerProps> = ({ timerLength, onTimeUp, onEndEarly }) => {
    const { t } = useTranslation();
    const [timeLeft, setTimeLeft] = useState(timerLength);
    const [isPaused, setIsPaused] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        if (isPaused || timeLeft <= 0) return;

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    onTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isPaused, timeLeft, onTimeUp]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Box sx={{ maxWidth: 'sm', mx: 'auto', textAlign: 'center', py: 5 }}>
            <Paper sx={{ p: 4 }}>
                <Typography variant="h4" gutterBottom>
                    {t('games.imposter.game.timer')}
                </Typography>
                <Typography variant="h1" sx={{ my: 4, fontWeight: 'bold', color: timeLeft < 30 ? 'error.main' : 'text.primary' }}>
                    {formatTime(timeLeft)}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                    <Button
                        variant="outlined"
                        size="large"
                        startIcon={isPaused ? <PlayArrowIcon /> : <PauseIcon />}
                        onClick={() => setIsPaused(!isPaused)}
                    >
                        {isPaused ? t('games.imposter.game.resume') : t('games.imposter.game.pause')}
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        size="large"
                        startIcon={<StopIcon />}
                        onClick={() => setShowConfirm(true)}
                    >
                        {t('games.imposter.game.end_round')}
                    </Button>
                </Box>
            </Paper>

            <Dialog open={showConfirm} onClose={() => setShowConfirm(false)}>
                <DialogTitle>{t('games.imposter.game.end_round')}</DialogTitle>
                <DialogContent>
                    <Typography>{t('games.imposter.game.confirm_end')}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowConfirm(false)}>{t('common.no')}</Button>
                    <Button onClick={() => onEndEarly()} color="error" variant="contained">
                        {t('common.yes')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
