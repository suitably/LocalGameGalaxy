import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { useTranslation } from 'react-i18next';
import type { Player, NightAction } from '../../logic/types';


interface RoleViewProps {
    players: Player[];
    onAction: (action: NightAction) => void;
    onSkip: () => void;
    instruction?: string;
}

export const CupidView: React.FC<RoleViewProps> = ({ players, onAction, onSkip, instruction }) => {
    const { t } = useTranslation();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const alivePlayers = players.filter(p => p.isAlive);

    const handleSelect = (id: string) => {
        const newSelected = selectedIds.includes(id)
            ? selectedIds.filter(pid => pid !== id)
            : [...selectedIds, id];

        setSelectedIds(newSelected);

        if (newSelected.length === 2) {
            onAction({ type: 'LINK_LOVERS', targetIds: [newSelected[0], newSelected[1]] });
        }
    };

    return (
        <Box textAlign="center">
            <FavoriteIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
            <Typography variant="h5">{t('games.werewolf.roles.CUPID')}</Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>{instruction || t('games.werewolf.ui.cupid.instruction')}</Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 4 }}>
                {alivePlayers.map(p => (
                    <Button
                        key={p.id}
                        variant={selectedIds.includes(p.id) ? "contained" : "outlined"}
                        onClick={() => handleSelect(p.id)}
                        color={selectedIds.includes(p.id) ? "error" : "primary"}
                    >
                        {p.name}
                    </Button>
                ))}
            </Box>

            <Button
                variant="contained"
                size="large"
                fullWidth
                disabled={selectedIds.length !== 2}
                onClick={() => onAction({ type: 'LINK_LOVERS', targetIds: [selectedIds[0], selectedIds[1]] })}
            >
                {t('common.next')}
            </Button>
            <Button sx={{ mt: 2 }} onClick={onSkip}>{t('common.skip')}</Button>
        </Box>
    );
};
