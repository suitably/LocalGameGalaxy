import React from 'react';
import ShieldIcon from '@mui/icons-material/Shield';
import { useTranslation } from 'react-i18next';
import { PlayerSelectionView } from '../PlayerSelectionView';
import type { Player, NightAction } from '../../logic/types';

interface RoleViewProps {
    players: Player[];
    onAction: (action: NightAction) => void;
    onSkip: () => void;
}

export const GuardianView: React.FC<RoleViewProps> = ({ players, onAction, onSkip }) => {
    const { t } = useTranslation();
    return (
        <PlayerSelectionView
            title={t('games.werewolf.roles.GUARDIAN')}
            icon={<ShieldIcon sx={{ fontSize: 60 }} />}
            instruction={t('games.werewolf.ui.guardian.instruction')}
            players={players.filter(p => p.isAlive)}
            onSelect={(id) => onAction({ type: 'PROTECT', targetId: id })}
            onSkip={onSkip}
            skipLabel={t('common.skip')}
            buttonColor="primary"
        />
    );
};
