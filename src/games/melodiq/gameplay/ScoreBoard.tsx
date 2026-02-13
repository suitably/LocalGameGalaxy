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
                padding: 2,
                animation: 'fadeIn 0.5s ease-in-out',
                '@keyframes fadeIn': {
                    '0%': { opacity: 0 },
                    '100%': { opacity: 1 },
                },
                overflowY: 'auto'
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
                maxWidth: 'lg',
                mb: 6,
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                px: 2
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
                                p: 2,
                                bgcolor: isWinner ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                border: isWinner ? '2px solid rgba(255, 215, 0, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 4,
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: player.history.length > 0 ? 2 : 0 }}>
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
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Typography variant="h5" sx={{ color: '#fff', fontWeight: isWinner ? 'bold' : 'normal' }}>
                                            {player.config.name}
                                        </Typography>
                                        {player.isNewRecord && (
                                            <Paper sx={{ bgcolor: '#ffd700', color: 'black', px: 1, py: 0.5, borderRadius: 1, fontWeight: 'bold', fontSize: '0.8rem' }}>
                                                NEW RECORD!
                                            </Paper>
                                        )}
                                        {player.loadingHistory && (
                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                                                Syncing history...
                                            </Typography>
                                        )}
                                    </Box>
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
                            </Box>

                            {/* History Section */}
                            {player.history.length > 0 && (
                                <Box sx={{ pl: 9, mt: 1 }}>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1 }}>
                                        HISTORY
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
                                        {player.history.slice(0, 5).map((h: any, i: number) => {
                                            // const isCurrent = h.score === player.score ...
                                            // Actually we can just key by index

                                            // Format date
                                            const date = new Date(h.date);
                                            const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                                            return (
                                                <Box key={i} sx={{
                                                    minWidth: 80,
                                                    p: 1,
                                                    bgcolor: 'rgba(0,0,0,0.3)',
                                                    borderRadius: 2,
                                                    border: h.score === player.score ? '1px solid rgba(255,255,255,0.3)' : 'none',
                                                    opacity: 0.8
                                                }}>
                                                    <Typography variant="body2" fontWeight="bold" color="white">
                                                        {Math.round(h.score).toLocaleString()}
                                                    </Typography>
                                                    <Typography variant="caption" color="rgba(255,255,255,0.5)">
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

            <Box sx={{ display: 'flex', gap: 2, mt: 'auto' }}>
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
                        color: 'white' // Evaluate if needed
                    }}
                >
                    {queue.length > 0 ? `Next: ${queue[0].song.title}` : 'Continue'}
                </Button>
            </Box>
        </Box>
    );
};
