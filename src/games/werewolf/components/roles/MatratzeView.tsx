import React from 'react';
import { Box } from '@mui/material';
import { PlayerSelectionView } from '../PlayerSelectionView';
import { useTranslation } from 'react-i18next';
import type { Player, NightAction } from '../../logic/types';

interface MatratzeViewProps {
    players: Player[];
    onAction: (action: NightAction) => void;
    onSkip: () => void;
    instruction?: string;
}

export const MatratzeView: React.FC<MatratzeViewProps> = ({ players, onAction, onSkip, instruction }) => {
    const { t } = useTranslation();

    const handleSelect = (targetId: string) => {
        onAction({ type: 'SLEEP', targetId });
    };

    return (
        <Box>
            <PlayerSelectionView
                title={t('games.werewolf.roles.dorfmatratze')}
                instruction={instruction || t('games.werewolf.ui.dorfmatratze.instruction')}
                players={players.filter(p => p.isAlive)}
                onSelect={handleSelect}
                onSkip={onSkip}
                skipLabel={t('common.skip')}
                icon="🛌"
                buttonColor="primary"
            />
        </Box>
    );
};
