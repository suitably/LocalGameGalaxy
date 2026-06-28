import React, { useMemo } from 'react';
import { Box, Typography, Button, Paper, Avatar, Chip, Grid } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'; // Trophy icon
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HistoryIcon from '@mui/icons-material/History';
import StarIcon from '@mui/icons-material/Star';
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
    onResume?: () => void;
    isPassive?: boolean;
    onMinimize?: () => void;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ players, onExit, onResume, isPassive, onMinimize }) => {
    const { queue } = useQueue();

    // 1. Session Ranking: Current players sorted by score
    const sessionRanking = useMemo(() => {
        return [...players].sort((a, b) => b.score - a.score);
    }, [players]);

    // 2. Historical Ranking: Aggregate all history from all players
    const historicalRanking = useMemo(() => {
        const allScores: Array<{
            name: string;
            score: number;
            date: string;
            hue: number;
            isCurrentSession?: boolean; // To highlight the current run
        }> = [];

        players.forEach(p => {
            // Include history if available
            if (p.history && p.history.length > 0) {
                p.history.forEach((h: any) => {
                    allScores.push({
                        name: p.config.name,
                        score: h.score,
                        date: h.date,
                        hue: p.config.hue,
                        // Heuristic: if score and date match current player's result, it's likely this session
                        // But rely on strict equality might be flaky if seconds differ.
                        // However, standard flow saves to DB then reads. Date ISO string should match.
                        isCurrentSession: false // default
                    });
                });
            } else {
                // If no history (e.g. remote syncing or first play), add current score manually
                // to make sure they appear in the concept of "All time best" for this session at least
                allScores.push({
                    name: p.config.name,
                    score: p.score,
                    date: new Date().toISOString(),
                    hue: p.config.hue,
                    isCurrentSession: true
                });
            }
        });

        // Filter out 0 scores or failed attempts if desired? Keeping simple for now.
        // Sort by score desc
        return allScores.sort((a, b) => b.score - a.score).slice(0, 50); // Top 50 generic limit
    }, [players]);

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'black', // Distinct background
                display: 'flex',
                flexDirection: 'column',
                zIndex: 2000,
                overflow: 'hidden',
                p: { xs: 2, md: 4 }
            }}
        >
            {isPassive && onMinimize && (
                <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
                    <Button variant="outlined" onClick={onMinimize} sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                        ▼ Minimize
                    </Button>
                </Box>
            )}
            <Typography variant="h3" sx={{
                textAlign: 'center',
                mb: 3,
                fontWeight: '900',
                background: 'linear-gradient(45deg, #FFD700 30%, #FF8E53 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 30px rgba(255, 215, 0, 0.3)',
                letterSpacing: 2,
                fontSize: { xs: '2rem', md: '3.5rem' }
            }}>
                SESSION RESULTS
            </Typography>

            <Grid container spacing={4} sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {/* LEFT: SESSION RANKING */}
                <Grid size={{ xs: 12, md: 7 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', pr: 1, pb: 2 }}>
                        {sessionRanking.map((player, index) => {
                            const isWinner = index === 0;
                            return (
                                <Paper
                                    key={player.config.id}
                                    elevation={isWinner ? 12 : 4}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        p: { xs: 2, md: 3 },
                                        borderRadius: 4,
                                        bgcolor: 'rgba(255, 255, 255, 0.08)',
                                        border: isWinner ? '2px solid rgba(255, 215, 0, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
                                        transition: 'transform 0.2s',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            bgcolor: 'rgba(255, 255, 255, 0.12)'
                                        },
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* Rank */}
                                    <Box sx={{
                                        width: 50,
                                        height: 50,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mr: 2
                                    }}>
                                        {isWinner ? (
                                            <EmojiEventsIcon sx={{ fontSize: 48, color: '#FFD700', filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.5))' }} />
                                        ) : (
                                            <Typography variant="h4" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>
                                                #{index + 1}
                                            </Typography>
                                        )}
                                    </Box>

                                    {/* Avatar */}
                                    <Avatar sx={{
                                        bgcolor: `hsl(${player.config.hue}, 100%, 50%)`,
                                        width: isWinner ? 64 : 48,
                                        height: isWinner ? 64 : 48,
                                        mr: 2,
                                        fontSize: isWinner ? '1.5rem' : '1rem',
                                        fontWeight: 'bold',
                                        border: '2px solid rgba(255,255,255,0.2)'
                                    }}>
                                        {player.config.name.substring(0, 1).toUpperCase()}
                                    </Avatar>

                                    {/* Name & Badge */}
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant={isWinner ? "h4" : "h5"} sx={{
                                            fontWeight: 'bold',
                                            color: 'white',
                                            mb: 0.5
                                        }}>
                                            {player.config.name}
                                        </Typography>
                                        {player.isNewRecord && (
                                            <Chip
                                                icon={<StarIcon sx={{ fontSize: '1rem !important' }} />}
                                                label="PERSONAL BEST"
                                                size="small"
                                                sx={{
                                                    bgcolor: '#FFD700',
                                                    color: 'black',
                                                    fontWeight: '800',
                                                    '& .MuiChip-icon': { color: 'black' }
                                                }}
                                            />
                                        )}
                                        {player.loadingHistory && (
                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                                                Synchronizing...
                                            </Typography>
                                        )}
                                    </Box>

                                    {/* Score */}
                                    <Typography variant={isWinner ? "h2" : "h3"} sx={{
                                        fontWeight: '900',
                                        color: isWinner ? '#FFD700' : 'rgba(255,255,255,0.9)',
                                        textShadow: isWinner ? '0 0 20px rgba(255, 215, 0, 0.4)' : 'none',
                                    }}>
                                        {Math.round(player.score).toLocaleString()}
                                    </Typography>
                                </Paper>
                            );
                        })}
                    </Box>
                </Grid>

                {/* RIGHT: HISTORICAL RANKING (Subtle/Dezent) */}
                <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <Paper sx={{
                        flex: 1,
                        bgcolor: 'rgba(0,0,0,0.4)',
                        borderRadius: 4,
                        border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)', bgcolor: 'rgba(255,255,255,0.02)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <HistoryIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
                                <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 'bold', letterSpacing: 1 }}>
                                    ALL-TIME BEST
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{ flex: 1, overflowY: 'auto', p: 0 }}>
                            {historicalRanking.length === 0 ? (
                                <Box sx={{ p: 4, textAlign: 'center' }}>
                                    <Typography color="text.secondary">No history available yet.</Typography>
                                </Box>
                            ) : (
                                historicalRanking.map((entry, index) => {
                                    const date = new Date(entry.date);
                                    const dateStr = date.toLocaleDateString(undefined, {
                                        month: '2-digit', day: '2-digit', year: '2-digit'
                                    });

                                    return (
                                        <Box
                                            key={index}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                p: 1.5,
                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                bgcolor: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                                                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                                            }}
                                        >
                                            <Typography variant="body1" sx={{ width: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}>
                                                {index + 1}.
                                            </Typography>
                                            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                                                <Typography variant="body1" sx={{
                                                    color: `hsl(${entry.hue}, 100%, 70%)`,
                                                    fontWeight: 'bold',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    mr: 1
                                                }}>
                                                    {entry.name}
                                                </Typography>
                                            </Box>
                                            <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'white', mx: 2, minWidth: 60, textAlign: 'right' }}>
                                                {Math.round(entry.score).toLocaleString()}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', minWidth: 60, textAlign: 'right' }}>
                                                {dateStr}
                                            </Typography>
                                        </Box>
                                    );
                                })
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* ACTION FOOTER */}
            {!isPassive ? (
                <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', gap: 2 }}>
                    {onResume && (
                        <Button variant="contained" size="large" onClick={onResume} startIcon={<PlayArrowIcon />} sx={{ borderRadius: 8, px: 4, bgcolor: 'rgba(255,255,255,0.1)' }}>
                            Resume
                        </Button>
                    )}
                    {queue.length > 0 && (
                        <Button variant="outlined" size="large" onClick={() => onExit(true)} sx={{ borderRadius: 8, px: 4, color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                            Main Menu
                        </Button>
                    )}
                    <Button
                        variant="contained"
                        size="large"
                        onClick={() => onExit(false)}
                        sx={{
                            borderRadius: 8,
                            px: 6,
                            py: 1.5,
                            backgroundImage: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)',
                            boxShadow: '0 4px 20px rgba(255, 107, 107, 0.4)',
                            fontWeight: 'bold',
                            fontSize: '1.2rem'
                        }}
                    >
                        {queue.length > 0 ? `NEXT: ${queue[0].song.title}`.toUpperCase() : 'CONTINUE'}
                    </Button>
                </Box>
            ) : (
                <Box sx={{ mt: 3, pt: 2, display: 'flex', justifyContent: 'center' }}>
                    <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                        Waiting for Host to continue...
                    </Typography>
                </Box>
            )}
        </Box>
    );
};
