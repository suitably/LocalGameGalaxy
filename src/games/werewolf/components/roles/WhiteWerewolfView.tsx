import React from 'react';
import PestControlRodentIcon from '@mui/icons-material/PestControlRodent';
import { useTranslation } from 'react-i18next';
import { PlayerSelectionView } from '../PlayerSelectionView';
import type { Player, NightAction } from '../../logic/types';

interface RoleViewProps {
    players: Player[];
    onAction: (action: NightAction) => void;
    onSkip: () => void;
}

export const WhiteWerewolfView: React.FC<RoleViewProps> = ({ players, onAction, onSkip }) => {
    const { t } = useTranslation();
    return (
        <PlayerSelectionView
            title={t('games.werewolf.roles.WHITE_WEREWOLF')}
            icon={<PestControlRodentIcon sx={{ fontSize: 60, color: 'grey.300' }} />}
            instruction={t('games.werewolf.ui.white_werewolf.instruction')}
            players={players.filter(p => p.isAlive && (p.role === 'WEREWOLF' || p.role === 'BLACK_WEREWOLF'))}
            onSelect={(id) => onAction({ type: 'KILL', targetId: id })}
            onSkip={onSkip}
            skipLabel={t('common.skip')}
            buttonColor="error"
        />
    );
};
