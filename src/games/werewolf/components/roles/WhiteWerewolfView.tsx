import React from 'react';
import PestControlRodentIcon from '@mui/icons-material/PestControlRodent';
import { useTranslation } from 'react-i18next';
import { PlayerSelectionView } from '../PlayerSelectionView';
import type { Player, NightAction } from '../../logic/types';
import { isWerewolf } from '../../logic/utils';

interface RoleViewProps {
    players: Player[];
    onAction: (action: NightAction) => void;
    onSkip: () => void;
    instruction?: string;
}

export const WhiteWerewolfView: React.FC<RoleViewProps> = ({ players, onAction, onSkip, instruction }) => {
    const { t } = useTranslation();
    return (
        <PlayerSelectionView
            title={t('games.werewolf.roles.WHITE_WEREWOLF')}
            icon={<PestControlRodentIcon sx={{ fontSize: 60, color: 'grey.300' }} />}
            instruction={instruction || t('games.werewolf.ui.white_werewolf.instruction')}
            // White Werewolf can kill any other werewolf
            players={players.filter(p => p.isAlive && isWerewolf(p) && p.role !== 'WHITE_WEREWOLF')}
            onSelect={(id) => onAction({ type: 'KILL', targetId: id })}
            onSkip={onSkip}
            skipLabel={t('common.skip')}
            buttonColor="error"
        />
    );
};
