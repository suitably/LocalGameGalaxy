import React, { useState } from 'react';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Button, Paper } from '@mui/material';
import { PlayerSelectionView } from '../PlayerSelectionView';
import type { Player, NightAction } from '../../logic/types';

interface RoleViewProps {
    players: Player[];
    onAction: (action: NightAction) => void;
    onSkip: () => void;
    instruction?: string;
}

export const ThiefView: React.FC<RoleViewProps> = ({ players, onAction, onSkip, instruction }) => {
    const { t } = useTranslation();
    const [stolenRoleData, setStolenRoleData] = useState<{ id: string; name: string; role: string } | null>(null);

    const handleSelect = (id: string) => {
        const victim = players.find(p => p.id === id);
        if (victim) {
            // Get the role label
            const roleKey = victim.isAlive ? (victim.role || 'VILLAGER') : 'VILLAGER'; // Fallback just in case
            const roleName = t(`games.werewolf.roles.${roleKey}`);
            setStolenRoleData({ id: victim.id, name: victim.name, role: roleName });
        }
    };

    const handleConfirm = () => {
        if (stolenRoleData) {
            onAction({ type: 'STEAL_ROLE', targetId: stolenRoleData.id });
        }
    };

    if (stolenRoleData) {
        return (
            <Box textAlign="center" mt={4}>
                <PersonSearchIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>{t('games.werewolf.roles.THIEF')}</Typography>

                <Paper sx={{ p: 4, my: 4, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" gutterBottom>
                        {instruction || t('games.werewolf.ui.thief.instruction')}
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 2, mb: 1 }}>
                        You stole the role from <strong>{stolenRoleData.name}</strong>:
                    </Typography>
                    <Typography variant="h3" color="secondary.main" fontWeight="bold">
                        {stolenRoleData.role}
                    </Typography>
                </Paper>

                <Button
                    variant="contained"
                    size="large"
                    color="primary"
                    onClick={handleConfirm}
                    sx={{ minWidth: 200 }}
                >
                    {t('common.next')}
                </Button>
            </Box>
        );
    }

    return (
        <PlayerSelectionView
            title={t('games.werewolf.roles.THIEF')}
            icon={<PersonSearchIcon sx={{ fontSize: 60 }} />}
            instruction={instruction || t('games.werewolf.ui.thief.instruction')}
            players={players.filter(p => p.isAlive)}
            onSelect={handleSelect}
            onSkip={onSkip}
            skipLabel={t('common.skip')}
            buttonColor="primary"
        />
    );
};
