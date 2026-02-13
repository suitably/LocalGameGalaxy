import React from 'react';
import { Box, Typography, Button, Paper, Avatar } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'; // Trophy icon
import type { UserProfile } from '../MelodiqSettings';
import { useQueue } from '../hooks/useQueue';

interface ScoreBoardProps {
    players: {
        config: UserProfile;
        score: number;
        history: any[];
        isNewRecord: boolean;
        loadingHistory?: boolean;
        isRemote?: boolean;
    }[];
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
                bgcolor: 'rgba(0,0,0,0.95)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
                padding: { xs: 1, sm: 2 },
                animation: 'fadeIn 0.5s ease-in-out',
                '@keyframes fadeIn': {
                    '0%': { opacity: 0 },
                    '100%': { opacity: 1 },
                },
                overflowY: 'auto'
            }}
        >
            <Typography variant="h2" sx={{
                mb: { xs: 2, md: 4 },
                fontWeight: 'bold',
                color: '#ffd700',
                textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
                fontSize: { xs: '2rem', sm: '3rem', md: '3.75rem' }
            }}>
                Session Results
            </Typography>

            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: { xs: 1, sm: 2 },
                width: '100%',
                maxWidth: 'lg',
                mb: { xs: 2, md: 6 },
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                px: { xs: 0, sm: 2 }
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
                                flexDirection: 'column',
                                p: { xs: 1.5, sm: 2 },
                                bgcolor: isWinner ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                border: isWinner ? '2px solid rgba(255, 215, 0, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                                borderRadius: { xs: 2, sm: 4 },
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: player.history.length > 0 ? 2 : 0 }}>
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: { xs: 30, sm: 40 },
                                    height: { xs: 30, sm: 40 },
                                    mr: { xs: 1, sm: 2 }
                                }}>
                                    {isWinner ? (
                                        <EmojiEventsIcon sx={{ color: '#ffd700', fontSize: { xs: 30, sm: 40 } }} />
                                    ) : (
                                        <Typography variant="h5" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>#{index + 1}</Typography>
                                    )}
                                </Box>

                                <Avatar sx={{ bgcolor: `hsl(${player.config.hue}, 100%, 50%)`, mr: { xs: 1, sm: 2 }, width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 } }}>
                                    {player.config.name.substring(0, 1).toUpperCase()}
                                </Avatar>

                                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                        <Typography variant="h5" sx={{ color: '#fff', fontWeight: isWinner ? 'bold' : 'normal', fontSize: { xs: '1.1rem', sm: '1.5rem' }, noWrap: true }}>
                                            {player.config.name}
                                        </Typography>
                                        {player.isNewRecord && (
                                            <Paper sx={{ bgcolor: '#ffd700', color: 'black', px: 1, py: 0.5, borderRadius: 1, fontWeight: 'bold', fontSize: { xs: '0.6rem', sm: '0.8rem' } }}>
                                                NEW RECORD!
                                            </Paper>
                                        )}
                                        {player.loadingHistory && (
                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                                                Syncing...
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>

                                <Typography variant="h3" sx={{
                                    color: isWinner ? '#ffd700' : 'rgba(255,255,255,0.9)',
                                    fontWeight: 'bold',
                                    textShadow: isWinner ? '0 0 15px rgba(255, 215, 0, 0.4)' : 'none',
                                    textAlign: 'right',
                                    minWidth: { xs: '80px', sm: '120px' },
                                    fontSize: { xs: '1.5rem', sm: '3rem' }
                                }}>
                                    {Math.round(player.score).toLocaleString()}
                                </Typography>
                            </Box>

                            {/* History Section */}
                            {player.history.length > 0 && (
                                <Box sx={{ pl: { xs: 0, sm: 9 }, mt: 1 }}>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1 }}>
                                        HISTORY
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
                                        {player.history.slice(0, 5).map((h: any, i: number) => {
                                            // Format date
                                            const date = new Date(h.date);
                                            const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                                            return (
                                                <Box key={i} sx={{
                                                    minWidth: { xs: 60, sm: 80 },
                                                    p: 1,
                                                    bgcolor: 'rgba(0,0,0,0.3)',
                                                    borderRadius: 2,
                                                    border: h.score === player.score ? '1px solid rgba(255,255,255,0.3)' : 'none',
                                                    opacity: 0.8
                                                }}>
                                                    <Typography variant="body2" fontWeight="bold" color="white" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                                        {Math.round(h.score).toLocaleString()}
                                                    </Typography>
                                                    <Typography variant="caption" color="rgba(255,255,255,0.5)" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                                                        {dateStr}
                                                    </Typography>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </Box>
                            )}
                        </Paper>
                    );
                })}
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mt: 'auto', flexDirection: { xs: 'column', sm: 'row' }, width: { xs: '100%', sm: 'auto' } }}>
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
                            width: { xs: '100%', sm: 'auto' },
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
                        color: 'white',
                        width: { xs: '100%', sm: 'auto' }
                    }}
                >
                    {queue.length > 0 ? `Next: ${queue[0].song.title}` : 'Continue'}
                </Button>
            </Box>
        </Box>
    );
};
