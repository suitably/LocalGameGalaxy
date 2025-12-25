import React, { useState } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import type { Player } from '../logic/types';
import { useTranslation } from 'react-i18next';

interface NightPhaseProps {
    players: Player[];
    round: number;
    onNextPhase: () => void;
    onNightAction: (targetId: string, role: string) => void;
}

export const NightPhase: React.FC<NightPhaseProps> = ({ players, round, onNextPhase, onNightAction }) => {
    const { t } = useTranslation();
    const [isMorningComing, setIsMorningComing] = useState(false);

    // Players alive
    const alivePlayers = players.filter(p => p.isAlive);
    const werewolves = alivePlayers.filter(p => p.role === 'WEREWOLF');

    const handleWerewolfAction = (targetId: string) => {
        onNightAction(targetId, 'WEREWOLF');
    };

    const handleEndNight = () => {
        setIsMorningComing(true);
        setTimeout(onNextPhase, 2000);
    };

    if (isMorningComing) {
        return (
            <Box sx={{ textAlign: 'center', mt: 10 }}>
                <Typography>{t('games.werewolf.narrator.morning_coming')}</Typography>
            </Box>
        );
    }

    return (
        <Box maxWidth="sm" mx="auto" textAlign="center" mt={4}>
            <Typography variant="h4" gutterBottom>{t('games.werewolf.narrator.dashboard_title', { round })}</Typography>
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.900', color: 'common.white' }}>
                <Typography variant="h6" gutterBottom color="secondary">
                    {t('games.werewolf.narrator.wait_for_werewolves')}
                </Typography>

                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2">{t('games.werewolf.narrator.werewolves_label')}</Typography>
                    <Typography variant="body1">{werewolves.map(w => w.name).join(', ')}</Typography>
                </Box>

                <Typography variant="subtitle2" gutterBottom>{t('games.werewolf.narrator.select_victim')}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {alivePlayers.map(p => (
                        <Button
                            key={p.id}
                            variant="contained"
                            color="error"
                            onClick={() => handleWerewolfAction(p.id)}
                            sx={{ mb: 1 }}
                        >
                            {p.name}
                        </Button>
                    ))}
                </Box>
            </Paper>

            <Button variant="outlined" fullWidth onClick={handleEndNight}>
                {t('games.werewolf.narrator.skip_to_morning')}
            </Button>
        </Box>
    );
};
