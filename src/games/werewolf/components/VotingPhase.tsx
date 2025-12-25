import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import type { Player } from '../logic/types';
import { useTranslation } from 'react-i18next';
import HowToVoteIcon from '@mui/icons-material/HowToVote';

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
        <Box maxWidth="sm" mx="auto" textAlign="center" mt={4}>
            <HowToVoteIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
                {t('games.werewolf.voting.title', { round })}
            </Typography>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    {t('games.werewolf.voting.select_player')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {t('games.werewolf.voting.instruction')}
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                    {alivePlayers.map(p => (
                        <Button
                            key={p.id}
                            variant="contained"
                            color="primary"
                            onClick={() => onVote(p.id)}
                            sx={{
                                minWidth: 120,
                                height: 60,
                                mb: 1
                            }}
                        >
                            {p.name}
                        </Button>
                    ))}
                </Box>
            </Paper>

            <Button
                variant="outlined"
                color="secondary"
                onClick={onSkipVote}
                sx={{ mt: 2 }}
            >
                {t('games.werewolf.voting.skip')}
            </Button>
        </Box>
    );
};
