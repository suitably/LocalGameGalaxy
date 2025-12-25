import React from 'react';
import type { Player } from '../logic/types';
import { useTranslation } from 'react-i18next';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import { PlayerSelectionView } from './PlayerSelectionView';

interface VotingPhaseProps {
    players: Player[];
    round: number;
    onVote: (playerId: string) => void;
    onSkipVote: () => void;
}

export const VotingPhase: React.FC<VotingPhaseProps> = ({ players, round, onVote, onSkipVote }) => {
    const { t } = useTranslation();

    const alivePlayers = players.filter(p => p.isAlive);

    return (
        <PlayerSelectionView
            icon={<HowToVoteIcon sx={{ fontSize: 60, color: 'primary.main' }} />}
            title={t('games.werewolf.voting.title', { round })}
            instruction={t('games.werewolf.voting.select_player')}
            players={alivePlayers}
            onSelect={onVote}
            onSkip={onSkipVote}
            skipLabel={t('games.werewolf.voting.skip')}
            buttonColor="primary"
        />
    );
};
