import React from 'react';
import { Box, Typography, Button, Paper, Avatar } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'; // Trophy icon
import type { UserProfile } from '../MelodiqSettings';
import { useQueue } from '../hooks/useQueue';

interface ScoreBoardProps {
    players: { config: UserProfile; score: number }[];
    onExit: (forceHome?: boolean) => void;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ players, onExit }) => {
    // Sort players by score descending
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const { queue } = useQueue();

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'rgba(0,0,0,0.85)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
                padding: 2,
                animation: 'fadeIn 0.5s ease-in-out',
                '@keyframes fadeIn': {
                    '0%': { opacity: 0 },
                    '100%': { opacity: 1 },
                },
            }}
        >
            <Typography variant="h2" sx={{ mb: 4, fontWeight: 'bold', color: '#ffd700', textShadow: '0 0 20px rgba(255, 215, 0, 0.5)' }}>
                Session Results
            </Typography>

            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                width: '100%',
                maxWidth: 'md', // 900px provides a good balance for reading vs full width
                mb: 6,
                maxHeight: '70vh', // Allow more height too
                overflowY: 'auto',
            }}>
                {sortedPlayers.length === 0 && (
                    <Typography variant="h5" sx={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', py: 4 }}>
                        No players in this session
                    </Typography>
                )}
                {sortedPlayers.map((player, index) => {
                    const isWinner = index === 0;
                    return (
                        <Paper
                            key={player.config.id}
                            elevation={isWinner ? 10 : 3}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                p: 2,
                                bgcolor: isWinner ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                border: isWinner ? '2px solid #ffd700' : '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 4,
                            }}
                        >
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 40,
                                height: 40,
                                mr: 2
                            }}>
                                {isWinner ? (
                                    <EmojiEventsIcon sx={{ color: '#ffd700', fontSize: 40 }} />
                                ) : (
                                    <Typography variant="h5" sx={{ color: 'rgba(255,255,255,0.5)' }}>#{index + 1}</Typography>
                                )}
                            </Box>

                            <Avatar sx={{ bgcolor: `hsl(${player.config.hue}, 100%, 50%)`, mr: 2 }}>
                                {player.config.name.substring(0, 1).toUpperCase()}
                            </Avatar>

                            <Box sx={{ flex: 1 }}>
                                <Typography variant="h5" sx={{ color: '#fff', fontWeight: isWinner ? 'bold' : 'normal' }}>
                                    {player.config.name}
                                </Typography>
                            </Box>

                            <Typography variant="h3" sx={{
                                color: isWinner ? '#ffd700' : 'rgba(255,255,255,0.9)',
                                fontWeight: 'bold',
                                textShadow: isWinner ? '0 0 15px rgba(255, 215, 0, 0.4)' : 'none',
                                textAlign: 'right',
                                minWidth: '120px'
                            }}>
                                {Math.round(player.score).toLocaleString()}
                            </Typography>
                        </Paper>
                    );
                })}
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
                {queue.length > 0 && (
                    <Button
                        variant="outlined"
                        size="large"
                        onClick={() => onExit(true)}
                        sx={{
                            px: 4,
                            py: 1.5,
                            fontSize: '1rem',
                            borderRadius: 50,
                            color: 'white',
                            borderColor: 'rgba(255,255,255,0.5)',
                            '&:hover': {
                                borderColor: 'white',
                                bgcolor: 'rgba(255,255,255,0.1)'
                            }
                        }}
                    >
                        Main Menu
                    </Button>
                )}
                <Button
                    variant="contained"
                    size="large"
                    onClick={() => onExit(false)}
                    sx={{
                        px: 6,
                        py: 1.5,
                        fontSize: '1.2rem',
                        borderRadius: 50,
                        backgroundImage: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                        boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                    }}
                >
                    {queue.length > 0 ? `Next: ${queue[0].song.title}` : 'Continue'}
                </Button>
            </Box>
        </Box>
    );
};
