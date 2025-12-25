import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import type { Player } from '../logic/types';
import { useTranslation } from 'react-i18next';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { PlayerSelectionView } from './PlayerSelectionView';

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
                <Typography variant="h5">{t('games.werewolf.narrator.morning_coming')}</Typography>
                <Typography variant="h1" sx={{ mt: 2 }}>🌅</Typography>
            </Box>
        );
    }

    const extraContent = (
        <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">{t('games.werewolf.narrator.werewolves_label')}</Typography>
            <Typography variant="body1" fontWeight="bold">
                {werewolves.map(w => w.name).join(', ')}
            </Typography>
        </Box>
    );

    return (
        <PlayerSelectionView
            icon={<DarkModeIcon sx={{ fontSize: 60, color: 'secondary.main' }} />}
            title={t('games.werewolf.narrator.dashboard_title', { round })}
            subtitle={t('games.werewolf.narrator.wait_for_werewolves')}
            instruction={t('games.werewolf.narrator.select_victim')}
            players={alivePlayers}
            onSelect={handleWerewolfAction}
            onSkip={handleEndNight}
            skipLabel={t('games.werewolf.narrator.skip_to_morning')}
            buttonColor="error"
            extraContent={extraContent}
        />
    );
};
