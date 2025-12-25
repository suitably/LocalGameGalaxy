import React from 'react';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import { useTranslation } from 'react-i18next';
import { PlayerSelectionView } from '../PlayerSelectionView';
import type { Player, NightAction } from '../../logic/types';

interface RoleViewProps {
    players: Player[];
    onAction: (action: NightAction) => void;
    onSkip: () => void;
}

export const ThiefView: React.FC<RoleViewProps> = ({ players, onAction, onSkip }) => {
    const { t } = useTranslation();
    return (
        <PlayerSelectionView
            title={t('games.werewolf.roles.THIEF')}
            icon={<PersonSearchIcon sx={{ fontSize: 60 }} />}
            instruction={t('games.werewolf.ui.thief.instruction')}
            players={players.filter(p => p.isAlive)}
            onSelect={(id) => onAction({ type: 'STEAL_ROLE', targetId: id })}
            onSkip={onSkip}
            skipLabel={t('common.skip')}
            buttonColor="primary"
        />
    );
};
