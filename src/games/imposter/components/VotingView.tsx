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
                                p: 3,
                                borderRadius: 3,
                                bgcolor: 'rgba(30, 30, 40, 0.7)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    bgcolor: 'rgba(50, 50, 70, 0.9)',
                                    transform: 'scale(1.05)',
                                    boxShadow: 8,
                                    borderColor: 'primary.main'
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
