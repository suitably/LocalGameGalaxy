import React from 'react';
import PestControlRodentIcon from '@mui/icons-material/PestControlRodent';
import { useTranslation } from 'react-i18next';
import { PlayerSelectionView } from '../PlayerSelectionView';
import type { Player, NightAction } from '../../logic/types';

interface RoleViewProps {
    players: Player[];
    onAction: (action: NightAction) => void;
    onSkip: () => void;
    powerState?: any;
}

export const BlackWerewolfView: React.FC<RoleViewProps> = ({ players, onAction, onSkip, powerState }) => {
    const { t } = useTranslation();
    return (
        <PlayerSelectionView
            title={t('games.werewolf.roles.BLACK_WEREWOLF')}
            icon={<PestControlRodentIcon sx={{ fontSize: 60 }} />}
            instruction={t('games.werewolf.ui.black_werewolf.instruction')}
            players={players.filter(p => p.isAlive && p.role !== 'WEREWOLF' && p.role !== 'BLACK_WEREWOLF')}
            onSelect={(id) => onAction({ type: 'INFECT', targetId: id })}
            onSkip={onSkip}
            skipLabel={t('common.skip')}
            buttonColor="error"
            disabled={!powerState?.hasInfected}
        />
    );
};
