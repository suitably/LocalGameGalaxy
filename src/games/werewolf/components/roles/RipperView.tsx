import React from 'react';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import { useTranslation } from 'react-i18next';
import { PlayerSelectionView } from '../PlayerSelectionView';
import type { Player, NightAction } from '../../logic/types';

interface RoleViewProps {
    players: Player[];
    onAction: (action: NightAction) => void;
    onSkip: () => void;
    instruction?: string;
}

export const RipperView: React.FC<RoleViewProps> = ({ players, onAction, onSkip, instruction }) => {
    const { t } = useTranslation();
    return (
        <PlayerSelectionView
            title={t('games.werewolf.roles.RIPPER')}
            icon={<PersonSearchIcon sx={{ fontSize: 60 }} />}
            instruction={instruction || t('games.werewolf.ui.ripper.instruction')}
            players={players.filter(p => p.isAlive)}
            onSelect={(id) => onAction({ type: 'KILL', targetId: id })}
            onSkip={onSkip}
            skipLabel={t('common.skip')}
            buttonColor="error"
        />
    );
};
