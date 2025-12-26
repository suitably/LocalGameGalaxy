import React from 'react';
import PestControlRodentIcon from '@mui/icons-material/PestControlRodent';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Button, Paper } from '@mui/material';
import type { Player, NightAction } from '../../logic/types';

interface RoleViewProps {
    players: Player[];
    victim: Player;
    onAction: (action: NightAction) => void;
    onSkip: () => void;
    powerState?: any;
    instruction?: string;
}

export const BlackWerewolfView: React.FC<RoleViewProps> = ({ victim, onAction, onSkip, instruction }) => {
    const { t } = useTranslation();

    return (
        <Box maxWidth="sm" mx="auto" textAlign="center">
            <PestControlRodentIcon sx={{ fontSize: 60, color: 'secondary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>{t('games.werewolf.roles.BLACK_WEREWOLF')}</Typography>

            <Paper sx={{ p: 3, mb: 3, bgcolor: 'rgba(0,0,0,0.1)' }}>
                <Typography variant="body1" sx={{ mb: 3 }}>
                    {instruction || t('games.werewolf.ui.black_werewolf.instruction')}
                </Typography>
                <Typography variant="h6" color="error" gutterBottom>
                    {t('games.werewolf.narrator.select_victim')} {victim.name}
                </Typography>
            </Paper>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    onClick={() => onAction({ type: 'INFECT', targetId: victim.id })}
                >
                    {t('games.werewolf.ui.black_werewolf.infect_victim', { name: victim.name })}
                </Button>

                <Button
                    variant="outlined"
                    onClick={onSkip}
                    size="large"
                >
                    {t('common.skip')}
                </Button>
            </Box>
        </Box>
    );
};

