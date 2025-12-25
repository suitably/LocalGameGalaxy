import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useTranslation } from 'react-i18next';
import { PlayerSelectionView } from '../PlayerSelectionView';
import type { Player, NightAction } from '../../logic/types';

interface RoleViewProps {
    players: Player[];
    onAction: (action: NightAction) => void;
    onSkip: () => void;
}

export const SeerView: React.FC<RoleViewProps> = ({ players, onAction, onSkip }) => {
    const { t } = useTranslation();
    const [revealedPlayer, setRevealedPlayer] = useState<Player | null>(null);

    if (revealedPlayer) {
        return (
            <Box textAlign="center">
                <VisibilityIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                <Typography variant="h4">{revealedPlayer.name}</Typography>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
                    <Typography variant="h6" color="primary">{t(`games.werewolf.roles.${revealedPlayer.role}`)}</Typography>
                    <Typography variant="body2">{t(`games.werewolf.role_descriptions.${revealedPlayer.role}`)}</Typography>
                </Box>
                <Button sx={{ mt: 6 }} variant="contained" size="large" fullWidth onClick={() => onAction({ type: 'NONE' })}>{t('common.next')}</Button>
            </Box>
        );
    }

    return (
        <PlayerSelectionView
            title={t('games.werewolf.roles.SEER')}
            icon={<VisibilityIcon sx={{ fontSize: 60 }} />}
            instruction={t('games.werewolf.ui.seer.instruction')}
            players={players.filter(p => p.isAlive)}
            onSelect={(id) => setRevealedPlayer(players.find(p => p.id === id) || null)}
            onSkip={onSkip}
            skipLabel={t('common.skip')}
            buttonColor="primary"
        />
    );
};
