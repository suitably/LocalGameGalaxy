import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';
import type { Player, NightAction, RoleDefinition } from '../../logic/types';
import { isWerewolf } from '../../logic/utils';

interface RoleViewProps {
    players: Player[];
    customRoles?: RoleDefinition[];
    onAction: (action: NightAction) => void;
    onSkip: () => void;
    instruction?: string;
}

export const DetectiveView: React.FC<RoleViewProps> = ({ players, customRoles, onAction, onSkip, instruction }) => {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<string[]>([]);
    const [result, setResult] = useState<boolean | null>(null);

    const handleCheck = () => {
        const p1 = players.find(p => p.id === selected[0]);
        const p2 = players.find(p => p.id === selected[1]);
        if (p1 && p2) {
            const camp1 = isWerewolf(p1, customRoles) ? 'WOLF' : 'VILLAGER';
            const camp2 = isWerewolf(p2, customRoles) ? 'WOLF' : 'VILLAGER';
            setResult(camp1 === camp2);
        }
    };

    if (result !== null) {
        return (
            <Box textAlign="center">
                <SearchIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                <Typography variant="h4" color={result ? "success.main" : "error.main"}>
                    {result ? t('games.werewolf.ui.detective.same_camp') : t('games.werewolf.ui.detective.different_camps')}
                </Typography>
                <Button sx={{ mt: 4 }} variant="contained" onClick={() => onAction({ type: 'COMPARE_CAMPS', targetIds: [selected[0], selected[1]] })}>{t('common.next')}</Button>
            </Box>
        );
    }

    return (
        <Box textAlign="center">
            <SearchIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5">{t('games.werewolf.roles.DETECTIVE')}</Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>{instruction || t('games.werewolf.ui.detective.instruction')}</Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 4 }}>
                {players.filter(p => p.isAlive).map(p => (
                    <Button
                        key={p.id}
                        variant={selected.includes(p.id) ? "contained" : "outlined"}
                        onClick={() => {
                            if (selected.includes(p.id)) setSelected(selected.filter(i => i !== p.id));
                            else if (selected.length < 2) setSelected([...selected, p.id]);
                        }}
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
                onClick={handleCheck}
            >
                {t('common.next')}
            </Button>
            <Button sx={{ mt: 2 }} onClick={onSkip}>{t('common.skip')}</Button>
        </Box>
    );
};
