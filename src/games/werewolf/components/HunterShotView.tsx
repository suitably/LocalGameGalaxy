import React from 'react';
import { PlayerSelectionView } from './PlayerSelectionView';
import type { Player } from '../logic/types';
import ActionIcon from '@mui/icons-material/GpsFixed';
import { useTranslation } from 'react-i18next';

interface HunterShotViewProps {
    hunter: Player;
    players: Player[];
    onShot: (targetId: string) => void;
    onSkip: () => void;
}

export const HunterShotView: React.FC<HunterShotViewProps> = ({ hunter, players, onShot, onSkip }) => {
    const { t } = useTranslation();
    const alivePlayers = players.filter(p => p.isAlive && p.id !== hunter.id);

    return (
        <PlayerSelectionView
            icon={<ActionIcon sx={{ fontSize: 60, color: 'error.main' }} />}
            title={t('games.werewolf.roles.HUNTER')}
            subtitle={t('games.werewolf.ui.hunter.shot_subtitle', { name: hunter.name })}
            instruction={t('games.werewolf.ui.hunter.instruction')}
            players={alivePlayers}
            onSelect={onShot}
            onSkip={onSkip}
            skipLabel={t('common.skip')}
            buttonColor="error"
        />
    );
};
