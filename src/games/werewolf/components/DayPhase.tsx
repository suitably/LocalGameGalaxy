import React, { useEffect } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import type { Player } from '../logic/types';
import { useTTS } from '../hooks/useTTS';
import { useTranslation } from 'react-i18next';
import WbSunnyIcon from '@mui/icons-material/WbSunny';

interface DayPhaseProps {
    players: Player[];
    round: number;
    onNextPhase: () => void;
    removedPlayerIds: string[]; // Players killed last night
}

export const DayPhase: React.FC<DayPhaseProps> = ({ players, round, onNextPhase, removedPlayerIds }) => {
    const { t } = useTranslation();
    const { speak } = useTTS();

    const killedPlayers = players.filter(p => removedPlayerIds.includes(p.id));

    useEffect(() => {
        // Announce deaths
        let message = t('games.werewolf.narrator.day_intro');
        if (killedPlayers.length > 0) {
            const names = killedPlayers.map(p => p.name).join(', ');
            message += ` ${t('games.werewolf.narrator.died_night', { names })}`;
        } else {
            message += ` ${t('games.werewolf.narrator.noone_died')}`;
        }

        speak(message);
    }, [killedPlayers, speak, t]);

    return (
        <Box maxWidth="sm" mx="auto" textAlign="center" mt={4}>
            <WbSunnyIcon sx={{ fontSize: 60, color: 'orange', mb: 2 }} />
            <Typography variant="h4" gutterBottom>{t('games.werewolf.narrator.day_label', { round })}</Typography>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    {killedPlayers.length > 0
                        ? t('games.werewolf.ui.died_last_night')
                        : t('games.werewolf.ui.peaceful_night')}
                </Typography>
                {killedPlayers.map(p => (
                    <Typography key={p.id} variant="body1" color="error">
                        💀 {p.name}
                    </Typography>
                ))}
            </Paper>

            <Button
                variant="contained"
                size="large"
                onClick={onNextPhase}
                sx={{ mt: 2 }}
            >
                {t('games.werewolf.ui.start_vote')}
            </Button>
        </Box >
    );
};
