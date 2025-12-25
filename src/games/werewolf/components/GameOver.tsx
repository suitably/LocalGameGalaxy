import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useTranslation } from 'react-i18next';

interface GameOverProps {
    winner: 'VILLAGERS' | 'WEREWOLVES';
    onPlayAgain: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({ winner, onPlayAgain }) => {
    const { t } = useTranslation();

    const isWerewolvesWin = winner === 'WEREWOLVES';

    return (
        <Box maxWidth="sm" mx="auto" textAlign="center" mt={4}>
            <EmojiEventsIcon sx={{ fontSize: 80, color: isWerewolvesWin ? 'error.main' : 'success.main', mb: 2 }} />

            <Typography variant="h3" gutterBottom sx={{ color: isWerewolvesWin ? 'error.main' : 'success.main' }}>
                {t('games.werewolf.game_over')}
            </Typography>

            <Paper sx={{
                p: 4,
                mb: 3,
                bgcolor: isWerewolvesWin ? 'error.dark' : 'success.dark',
                color: 'common.white'
            }}>
                <Typography variant="h4" gutterBottom>
                    {isWerewolvesWin ? '🐺' : '🏘️'}
                </Typography>
                <Typography variant="h5">
                    {isWerewolvesWin
                        ? t('games.werewolf.werewolves_win')
                        : t('games.werewolf.villagers_win')
                    }
                </Typography>
            </Paper>

            <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={onPlayAgain}
                sx={{ mt: 2 }}
            >
                {t('games.werewolf.play_again')}
            </Button>
        </Box>
    );
};
