import React, { useEffect, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import type { Player } from '../logic/types';
import { useTTS } from '../hooks/useTTS';
import { useTranslation } from 'react-i18next';

interface NightPhaseProps {
    players: Player[];
    round: number;
    onNextPhase: () => void;
    onNightAction: (targetId: string, role: string) => void;
}

export const NightPhase: React.FC<NightPhaseProps> = ({ players, round, onNextPhase, onNightAction }) => {
    const { t } = useTranslation();
    const { speak } = useTTS();
    const [subPhase, setSubPhase] = useState<'SLEEP' | 'WEREWOLF' | 'SEER' | 'END'>('SLEEP');

    // Players alive
    const alivePlayers = players.filter(p => p.isAlive);
    const werewolves = alivePlayers.filter(p => p.role === 'WEREWOLF');

    useEffect(() => {
        // Narrate start of night
        if (subPhase === 'SLEEP') {
            speak(t('games.werewolf.narrator.night_start'));
            const timer = setTimeout(() => setSubPhase('WEREWOLF'), 4000);
            return () => clearTimeout(timer);
        }

        if (subPhase === 'WEREWOLF') {
            speak(t('games.werewolf.narrator.werewolves_wake'));
        }
    }, [subPhase, speak, t]);

    const handleWerewolfAction = (targetId: string) => {
        onNightAction(targetId, 'WEREWOLF');
        speak(t('games.werewolf.narrator.werewolves_sleep'));
        setTimeout(() => {
            // Skip Seer for MVP or if no seer
            setSubPhase('END');
        }, 2000);
    };

    const handleEndNight = () => {
        speak(t('games.werewolf.narrator.day_start'));
        setTimeout(onNextPhase, 2000);
    };

    if (subPhase === 'END') {
        handleEndNight(); // Auto transition
        return <Box sx={{ textAlign: 'center', mt: 10 }}><Typography>Morning is coming...</Typography></Box>;
    }

    return (
        <Box maxWidth="sm" mx="auto" textAlign="center" mt={4}>
            <Typography variant="h4" gutterBottom>
                Night {round}
            </Typography>

            {
                subPhase === 'SLEEP' && (
                    <Typography variant="h2">😴</Typography>
                )
            }

            {
                subPhase === 'WEREWOLF' && (
                    <Box>
                        <Typography variant="h6" color="error" gutterBottom>
                            Werewolves, choose a victim.
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            Pass device to a Werewolf ({werewolves.map(w => w.name).join(', ')}).
                        </Typography>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            {alivePlayers.filter(p => p.role !== 'WEREWOLF').map(p => (
                                <Box key={p.id} sx={{ width: 'calc(50% - 8px)' }}>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        sx={{ height: 80 }}
                                        onClick={() => handleWerewolfAction(p.id)}
                                    >
                                        {p.name}
                                    </Button>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )
            }
        </Box >
    );
};
