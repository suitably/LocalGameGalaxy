import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { useTranslation } from 'react-i18next';
import type { Player, NightAction } from '../../logic/types';

interface RoleViewProps {
    players: Player[];
    onAction: (action: NightAction) => void;
    onSkip: () => void;
}

export const CupidView: React.FC<RoleViewProps> = ({ players, onAction, onSkip }) => {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<string[]>([]);
    const alivePlayers = players.filter(p => p.isAlive);

    const handleSelect = (id: string) => {
        if (selected.includes(id)) {
            setSelected(selected.filter(i => i !== id));
        } else if (selected.length < 2) {
            setSelected([...selected, id]);
        }
    };

    return (
        <Box textAlign="center">
            <FavoriteIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
            <Typography variant="h5">{t('games.werewolf.roles.CUPID')}</Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>{t('games.werewolf.ui.cupid.instruction')}</Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 4 }}>
                {alivePlayers.map(p => (
                    <Button
                        key={p.id}
                        variant={selected.includes(p.id) ? "contained" : "outlined"}
                        onClick={() => handleSelect(p.id)}
                        color={selected.includes(p.id) ? "error" : "primary"}
                    >
                        {p.name}
                    </Button>
                ))}
            </Box>

            <Button
                variant="contained"
                size="large"
                fullWidth
                disabled={selected.length !== 2}
                onClick={() => onAction({ type: 'LINK_LOVERS', targetIds: [selected[0], selected[1]] })}
            >
                {t('common.next')}
            </Button>
            <Button sx={{ mt: 2 }} onClick={onSkip}>{t('common.skip')}</Button>
        </Box>
    );
};
