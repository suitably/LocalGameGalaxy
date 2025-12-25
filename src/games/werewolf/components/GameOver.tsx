import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useTranslation } from 'react-i18next';

interface GameOverProps {
    winner: 'VILLAGERS' | 'WEREWOLVES' | 'WHITE_WEREWOLF' | 'LOVERS' | 'ANGEL' | 'RIPPER' | 'SURVIVOR' | 'PYROMANIAC' | 'EASTER_BUNNY';
    onPlayAgain: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({ winner, onPlayAgain }) => {
    const { t } = useTranslation();

    const getWinnerInfo = () => {
        switch (winner) {
            case 'WEREWOLVES': return { color: 'error.main', bgColor: 'error.dark', icon: '🐺', label: t('games.werewolf.roles.WEREWOLF') };
            case 'VILLAGERS': return { color: 'success.main', bgColor: 'success.dark', icon: '🏘️', label: t('games.werewolf.roles.VILLAGER') };
            case 'WHITE_WEREWOLF': return { color: 'grey.500', bgColor: 'grey.700', icon: '🐺⚪', label: t('games.werewolf.roles.WHITE_WEREWOLF') };
            case 'LOVERS': return { color: 'pink.main', bgColor: 'pink.dark', icon: '❤️', label: t('games.werewolf.ui.lovers.label') };
            case 'ANGEL': return { color: 'info.main', bgColor: 'info.dark', icon: '😇', label: t('games.werewolf.roles.ANGEL') };
            case 'RIPPER': return { color: 'error.main', bgColor: 'error.dark', icon: '🔪', label: t('games.werewolf.roles.RIPPER') };
            case 'SURVIVOR': return { color: 'warning.main', bgColor: 'warning.dark', icon: '🛡️', label: t('games.werewolf.roles.SURVIVOR') };
            case 'PYROMANIAC': return { color: 'error.main', bgColor: 'error.dark', icon: '🔥', label: t('games.werewolf.roles.PYROMANIAC') };
            case 'EASTER_BUNNY': return { color: 'orange.main', bgColor: 'orange.dark', icon: '🐰', label: t('games.werewolf.roles.EASTER_BUNNY') };
            default: return { color: 'primary.main', bgColor: 'primary.dark', icon: '🏆', label: winner };
        }
    };

    const info = getWinnerInfo();

    return (
        <Box maxWidth="sm" mx="auto" textAlign="center" mt={4}>
            <EmojiEventsIcon sx={{ fontSize: 80, color: info.color, mb: 2 }} />

            <Typography variant="h3" gutterBottom sx={{ color: info.color }}>
                {t('games.werewolf.game_over')}
            </Typography>

            <Paper sx={{
                p: 4,
                mb: 3,
                bgcolor: info.bgColor,
                color: 'common.white'
            }}>
                <Typography variant="h4" gutterBottom>
                    {info.icon}
                </Typography>
                <Typography variant="h5">
                    {t('games.werewolf.winner_label', { winner: info.label })}
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
