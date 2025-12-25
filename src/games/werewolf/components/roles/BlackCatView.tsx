import React from 'react';
import PetsIcon from '@mui/icons-material/Pets';
import { useTranslation } from 'react-i18next';
import { PlayerSelectionView } from '../PlayerSelectionView';
import type { Player, NightAction } from '../../logic/types';

interface RoleViewProps {
    players: Player[];
    onAction: (action: NightAction) => void;
    onSkip: () => void;
    instruction?: string;
}

export const BlackCatView: React.FC<RoleViewProps> = ({ players, onAction, onSkip, instruction }) => {
    const { t } = useTranslation();

    return (
        <PlayerSelectionView
            title={t('games.werewolf.roles.BLACK_CAT')}
            icon={<PetsIcon sx={{ fontSize: 60 }} />}
            instruction={instruction || t('games.werewolf.ui.black_cat.instruction')}
            players={players.filter(p => p.isAlive)}
            onSelect={(id) => onAction({ type: 'CURSE', targetId: id })}
            onSkip={onSkip}
            skipLabel={t('common.skip')}
            buttonColor="warning"
        />
    );
};
