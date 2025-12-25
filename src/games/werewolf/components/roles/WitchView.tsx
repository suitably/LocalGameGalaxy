import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useTranslation } from 'react-i18next';
import { PlayerSelectionView } from '../PlayerSelectionView';
import type { Player, NightAction } from '../../logic/types';

interface RoleViewProps {
    players: Player[];
    onAction: (action: NightAction) => void;
    onSkip: () => void;
    powerState?: any;
}

export const WitchView: React.FC<RoleViewProps> = ({ players, onAction, onSkip, powerState }) => {
    const { t } = useTranslation();
    const [action, setAction] = useState<'HEAL' | 'KILL' | null>(null);

    const deadSoon = players.find(p => p.powerState.isDeadSoon);
    const alivePlayers = players.filter(p => p.isAlive);

    if (action === 'HEAL' && deadSoon) {
        return (
            <Box textAlign="center">
                <Typography variant="h6" sx={{ mb: 2 }}>{t('games.werewolf.ui.witch.save_player', { name: deadSoon.name })}</Typography>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button onClick={() => onAction({ type: 'HEAL', targetId: deadSoon.id })} variant="contained" color="success">{t('common.yes')}</Button>
                    <Button onClick={() => setAction(null)} variant="outlined">{t('common.no')}</Button>
                </Box>
            </Box>
        );
    }

    if (action === 'KILL') {
        return (
            <PlayerSelectionView
                title={t('games.werewolf.roles.WITCH')}
                icon={<AutoFixHighIcon sx={{ fontSize: 60 }} />}
                instruction={t('games.werewolf.ui.witch.select_kill')}
                players={alivePlayers.filter(p => !p.powerState.isDeadSoon)}
                onSelect={(id) => onAction({ type: 'KILL', targetId: id })}
                onSkip={() => setAction(null)}
                skipLabel={t('common.back')}
                buttonColor="error"
            />
        );
    }

    return (
        <Box textAlign="center">
            <AutoFixHighIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>{t('games.werewolf.roles.WITCH')}</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 4, maxWidth: 300, mx: 'auto' }}>
                <Button
                    variant="contained"
                    color="success"
                    disabled={!powerState?.hasHealPotion || !deadSoon}
                    onClick={() => setAction('HEAL')}
                    size="large"
                >
                    {t('games.werewolf.ui.witch.use_heal')}
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    disabled={!powerState?.hasKillPotion}
                    onClick={() => setAction('KILL')}
                    size="large"
                >
                    {t('games.werewolf.ui.witch.use_kill')}
                </Button>
                <Button sx={{ mt: 2 }} onClick={onSkip} variant="outlined">{t('common.skip')}</Button>
            </Box>
        </Box>
    );
};
