import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import type { Player } from '../logic/types';
import { useTTS } from '../hooks/useTTS';
import { useTranslation } from 'react-i18next';

interface NightPhaseProps {
    players: Player[];
    round: number;
    isNarratorMode: boolean;
    onNextPhase: () => void;
    onNightAction: (targetId: string, role: string) => void;
}

export const NightPhase: React.FC<NightPhaseProps> = ({ players, round, isNarratorMode, onNextPhase, onNightAction }) => {
    const { t } = useTranslation();
    const { speak } = useTTS();
    const [subPhase, setSubPhase] = useState<'SLEEP' | 'WEREWOLF' | 'SEER' | 'END'>('SLEEP');
    const [isActionRevealed, setIsActionRevealed] = useState(false);

    // Players alive
    const alivePlayers = players.filter(p => p.isAlive);
    const werewolves = alivePlayers.filter(p => p.role === 'WEREWOLF');
    const isHumanNarrator = isNarratorMode;

    useEffect(() => {
        if (isHumanNarrator) return; // Human handles narration

        // App-led narration
        if (subPhase === 'SLEEP') {
            speak(t('games.werewolf.narrator.night_start'));
            const timer = setTimeout(() => setSubPhase('WEREWOLF'), 4000);
            return () => clearTimeout(timer);
        }

        if (subPhase === 'WEREWOLF') {
            speak(t('games.werewolf.narrator.werewolves_wake'));
        }
    }, [subPhase, speak, t, isHumanNarrator]);

    const handleWerewolfAction = (targetId: string) => {
        onNightAction(targetId, 'WEREWOLF');
        setIsActionRevealed(false);
        if (!isHumanNarrator) {
            speak(t('games.werewolf.narrator.werewolves_sleep'));
            setTimeout(() => {
                setSubPhase('END');
            }, 2000);
        }
    };

    const handleEndNight = () => {
        if (!isHumanNarrator) {
            speak(t('games.werewolf.narrator.day_start'));
            setTimeout(onNextPhase, 2000);
        } else {
            onNextPhase();
        }
    };

    if (subPhase === 'END') {
        handleEndNight(); // Auto transition
        return <Box sx={{ textAlign: 'center', mt: 10 }}><Typography>{t('games.werewolf.narrator.morning_coming')}</Typography></Box>;
    }

    // --- NARRATOR DASHBOARD ---
    if (isHumanNarrator) {
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

                <Button variant="outlined" fullWidth onClick={() => setSubPhase('END')}>
                    {t('games.werewolf.narrator.skip_to_morning')}
                </Button>
            </Box>
        );
    }

    // --- STEALTH UI (App as Narrator) ---
    return (
        <Box
            maxWidth="sm"
            mx="auto"
            textAlign="center"
            sx={{
                minHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                bgcolor: isActionRevealed ? 'grey.900' : 'common.black',
                transition: 'background-color 0.5s ease'
            }}
        >
            <Typography variant="h4" gutterBottom sx={{ color: 'grey.800', opacity: 0.3 }}>
                {t('games.werewolf.narrator.night_label', { round })}
            </Typography>

            {subPhase === 'SLEEP' && (
                <Box>
                    <Typography variant="h1" sx={{ filter: 'grayscale(1)', opacity: 0.2 }}>😴</Typography>
                    <Typography variant="body2" sx={{ color: 'grey.800', mt: 2 }}>
                        {t('games.werewolf.narrator.night_start')}
                    </Typography>
                </Box>
            )}

            {subPhase === 'WEREWOLF' && (
                <Box>
                    {!isActionRevealed ? (
                        <Box>
                            <Typography variant="body2" sx={{ color: 'grey.800', mb: 4 }}>
                                {t('games.werewolf.ui.pass_to_werewolf')}
                            </Typography>
                            <Button
                                variant="contained"
                                size="large"
                                onClick={() => setIsActionRevealed(true)}
                                sx={{
                                    width: 200,
                                    height: 200,
                                    borderRadius: '50%',
                                    bgcolor: 'grey.900',
                                    color: 'grey.400',
                                    '&:hover': { bgcolor: 'grey.800' }
                                }}
                            >
                                {t('games.werewolf.ui.tap_to_act')}
                            </Button>
                        </Box>
                    ) : (
                        <Box>
                            <Typography variant="h6" color="error" gutterBottom>
                                {t('games.werewolf.narrator.werewolves_wake')}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, p: 2 }}>
                                {alivePlayers.filter(p => p.role !== 'WEREWOLF').map(p => (
                                    <Button
                                        key={p.id}
                                        variant="outlined"
                                        color="error"
                                        fullWidth
                                        sx={{
                                            height: 60,
                                            borderColor: 'error.dark',
                                            color: 'error.light',
                                            '&:active': { bgcolor: 'error.dark' }
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleWerewolfAction(p.id);
                                        }}
                                    >
                                        {p.name}
                                    </Button>
                                ))}
                            </Box>
                            <Button
                                variant="text"
                                sx={{ color: 'grey.600', mt: 2 }}
                                onClick={() => setIsActionRevealed(false)}
                            >
                                {t('games.werewolf.ui.hide_screen')}
                            </Button>
                        </Box>
                    )}
                </Box>
            )}
        </Box >
    );
};
