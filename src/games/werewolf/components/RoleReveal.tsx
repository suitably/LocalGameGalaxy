import React, { useState } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import type { Player } from '../logic/types';
import { useTranslation } from 'react-i18next';

interface RoleRevealProps {
    players: Player[];
    onComplete: () => void;
}

export const RoleReveal: React.FC<RoleRevealProps> = ({ players, onComplete }) => {
    const { t } = useTranslation();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isRevealed, setIsRevealed] = useState(false);

    const currentPlayer = players[currentIndex];

    const handleNext = () => {
        setIsRevealed(false);
        if (currentIndex < players.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onComplete();
        }
    };

    return (
        <Box maxWidth="sm" mx="auto" textAlign="center" mt={4}>
            <Typography variant="h5" gutterBottom>
                {isRevealed ? t('games.werewolf.role_reveal') : t('games.werewolf.pass_device_instruction', { name: currentPlayer.name })}
            </Typography>

            <Paper
                sx={{
                    p: 4,
                    my: 3,
                    minHeight: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: isRevealed ? 'background.paper' : 'action.hover'
                }}
            >
                {!isRevealed ? (
                    <Box>
                        <Typography variant="h2" sx={{ fontSize: 60, mb: 2 }}>🤫</Typography>
                        <Typography>{t('games.werewolf.pass_device_instruction', { name: currentPlayer.name })}</Typography>
                    </Box>
                ) : (
                    <Box>
                        <Typography variant="h4" color="secondary" gutterBottom>
                            {t(`games.werewolf.roles.${currentPlayer.role}`)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {t(`games.werewolf.role_descriptions.${currentPlayer.role}`)}
                        </Typography>
                    </Box>
                )}
            </Paper>

            {!isRevealed ? (
                <Button
                    variant="contained"
                    size="large"
                    onClick={() => setIsRevealed(true)}
                    startIcon={<VisibilityIcon />}
                >
                    {t('games.werewolf.reveal_role')}
                </Button>
            ) : (
                <Button
                    variant="contained"
                    size="large"
                    onClick={handleNext}
                    startIcon={<VisibilityOffIcon />}
                    color="secondary"
                >
                    {currentIndex < players.length - 1 ? t('common.next') : t('games.werewolf.start_night')}
                </Button>
            )}
        </Box>
    );
};
