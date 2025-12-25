import React from 'react';
import { Box, Typography, Grid, Paper, Avatar } from '@mui/material';
import { useTranslation } from 'react-i18next';
import PersonIcon from '@mui/icons-material/Person';

interface VotingViewProps {
    players: { id: string; name: string; isKicked?: boolean }[];
    onSelectPlayer: (id: string) => void;
}

export const VotingView: React.FC<VotingViewProps> = ({ players, onSelectPlayer }) => {
    const { t } = useTranslation();

    const alivePlayers = players.filter(p => !p.isKicked);

    return (
        <Box sx={{ maxWidth: 'sm', mx: 'auto', textAlign: 'center', py: 5 }}>
            <Typography variant="h4" gutterBottom>
                {t('games.imposter.game.kick_title')}
            </Typography>
            <Grid container spacing={2} sx={{ mt: 3 }}>
                {alivePlayers.map((player) => (
                    <Grid size={{ xs: 6 }} key={player.id}>
                        <Paper
                            elevation={3}
                            sx={{
                                p: 2,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: '0.2s',
                                '&:hover': {
                                    bgcolor: 'action.hover',
                                    transform: 'scale(1.05)'
                                }
                            }}
                            onClick={() => onSelectPlayer(player.id)}
                        >
                            <Avatar sx={{ width: 56, height: 56, mb: 1, bgcolor: 'primary.main' }}>
                                <PersonIcon />
                            </Avatar>
                            <Typography variant="h6">{player.name}</Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};
