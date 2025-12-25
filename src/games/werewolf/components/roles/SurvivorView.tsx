import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import { useTranslation } from 'react-i18next';
import type { Player, NightAction } from '../../logic/types';

interface RoleViewProps {
    players: Player[];
    onAction: (action: NightAction) => void;
    onSkip: () => void;
    powerState?: any;
    instruction?: string;
}

export const SurvivorView: React.FC<RoleViewProps> = ({ onAction, onSkip, powerState, instruction }) => {
    const { t } = useTranslation();
    return (
        <Box textAlign="center">
            <SecurityIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5">{t('games.werewolf.roles.SURVIVOR')}</Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>{instruction || t('games.werewolf.ui.survivor.instruction')}</Typography>
            <Button
                variant="contained"
                size="large"
                color="success"
                disabled={!powerState?.protectionsLeft}
                onClick={() => onAction({ type: 'PROTECT', targetId: '' })} // targetId empty means self
            >
                {t('games.werewolf.ui.survivor.use_protection', { count: powerState?.protectionsLeft })}
            </Button>
            <Button sx={{ mt: 4, display: 'block', mx: 'auto' }} onClick={onSkip}>{t('common.skip')}</Button>
        </Box>
    );
};
