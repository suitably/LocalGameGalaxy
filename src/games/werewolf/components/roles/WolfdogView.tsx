import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import PetsIcon from '@mui/icons-material/Pets';
import { useTranslation } from 'react-i18next';
import type { Player, NightAction } from '../../logic/types';

interface RoleViewProps {
    players: Player[];
    onAction: (action: NightAction) => void;
    onSkip: () => void;
}

export const WolfdogView: React.FC<RoleViewProps> = ({ onAction }) => {
    const { t } = useTranslation();
    return (
        <Box textAlign="center">
            <PetsIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5">{t('games.werewolf.roles.WOLFDOG')}</Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>{t('games.werewolf.ui.wolfdog.instruction')}</Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button size="large" variant="contained" onClick={() => onAction({ type: 'CHOOSE_CAMP', camp: 'VILLAGER' })}>
                    {t('games.werewolf.ui.wolfdog.villager')}
                </Button>
                <Button size="large" variant="contained" color="error" onClick={() => onAction({ type: 'CHOOSE_CAMP', camp: 'WEREWOLF' })}>
                    {t('games.werewolf.ui.wolfdog.werewolf')}
                </Button>
            </Box>
        </Box>
    );
};
