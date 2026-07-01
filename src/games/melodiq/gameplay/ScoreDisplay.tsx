import { useState, forwardRef, useImperativeHandle } from 'react';
import { Box, Typography } from '@mui/material';
import { keyframes } from '@emotion/react';

// --- Types ---
export type RatingType = 'Perfect' | 'Good' | 'Okay' | 'Miss';

export interface ScoreDisplayHandle {
    triggerHit: (playerId: string, rating: RatingType, combo: number, score: number) => void;
}

interface ScoreDisplayProps {
    players: { id: string; name: string; hue: number }[];
    scale?: number;
}

interface PlayerVisualState {
    id: string;
    score: number;
    combo: number;
    lastRating: RatingType | null;
    ratingId: number; // Increment to trigger anim
}

// --- Rankings Logic ---
// We can define ranks based on score thresholds (assuming max score ~1000 per song)
const RANKS = [
    { threshold: 0, title: "Beginner", color: "#888" },
    { threshold: 200, title: "Wannabe", color: "#4caf50" }, // Green
    { threshold: 500, title: "Rising Star", color: "#2196f3" }, // Blue
    { threshold: 800, title: "Rockstar", color: "#9c27b0" }, // Purple
    { threshold: 950, title: "Legend", color: "#ffeb3b" } // Gold
];

const getRank = (score: number) => {
    let rank = RANKS[0];
    for (const r of RANKS) {
        if (score >= r.threshold) rank = r;
    }
    return rank;
};

// --- Animations ---


const floatUp = keyframes`
  0% { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-20px) scale(1.1); opacity: 0; }
`;

// --- Sub-Component: Single Player Score (Compact) ---
const PlayerScoreDisplay = ({ state, config }: { state: PlayerVisualState, config: { name: string, hue: number } }) => {
    const rank = getRank(state.score);
    // Calculate progress to next rank
    const currentRankIdx = RANKS.indexOf(rank);
    const nextRank = RANKS[currentRankIdx + 1];
    let progress = 100;
    if (nextRank) {
        const span = nextRank.threshold - rank.threshold;
        const current = state.score - rank.threshold;
        progress = Math.min(100, Math.max(0, (current / span) * 100));
    }

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center', // Center align within the player block
            position: 'relative',
            opacity: 0.9
        }}>
            {/* Rating Popup (Compact) */}
            {state.lastRating && state.lastRating !== 'Miss' && (
                <Typography
                    key={state.ratingId}
                    variant="h6" // Smaller variant
                    sx={{
                        position: 'absolute',
                        top: -24, // Above the score
                        right: 0,
                        fontWeight: 900,
                        color: state.lastRating === 'Perfect' ? '#ffeb3b' : (state.lastRating === 'Good' ? '#4caf50' : '#fff'),
                        textShadow: '0 0 5px rgba(0,0,0,0.8)',
                        animation: `${floatUp} 0.6s ease-out forwards`,
                        whiteSpace: 'nowrap',
                        zIndex: 10,
                        fontStyle: 'italic'
                    }}
                >
                    {state.lastRating}!
                </Typography>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* Score Info (Compact) */}
                <Box sx={{ textAlign: 'right' }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Typography variant="caption" sx={{
                            color: `hsl(${config.hue}, 100%, 80%)`,
                            fontWeight: 'bold',
                            textShadow: '0 0 2px rgba(0,0,0,0.8)'
                        }}>
                            {config.name}
                        </Typography>
                        <Typography variant="subtitle1" sx={{
                            fontWeight: 900,
                            color: 'white',
                            textShadow: '0 0 4px rgba(0,0,0,0.8)',
                            lineHeight: 1
                        }}>
                            {state.score.toLocaleString()}
                        </Typography>
                    </Box>

                    {/* Rank / Progress Bar (Compact) */}
                    <Box sx={{ width: 100, position: 'relative', mt: 0.2 }}>
                        <Box sx={{
                            height: 3,
                            width: '100%',
                            bgcolor: 'rgba(255,255,255,0.2)',
                            borderRadius: 1,
                            overflow: 'hidden'
                        }}>
                            <Box sx={{
                                height: '100%',
                                width: `${progress}%`,
                                bgcolor: rank.color,
                                transition: 'width 0.3s ease-out',
                                boxShadow: `0 0 5px ${rank.color}`
                            }} />
                        </Box>
                        <Typography variant="caption" sx={{
                            fontSize: '0.6rem',
                            color: rank.color,
                            fontWeight: 'bold',
                            textShadow: '0 0 2px black',
                            display: 'block',
                            lineHeight: 1,
                            mt: 0.2
                        }}>
                            {rank.title}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export const ScoreDisplay = forwardRef<ScoreDisplayHandle, ScoreDisplayProps>(({ players }, ref) => {
    // We maintain internal state for high-frequency updates to avoid re-rendering the whole GameSession
    // `players` prop is used for Config (name, hue), but Score/Combo is local here.
    const [visualStates, setVisualStates] = useState<Record<string, PlayerVisualState>>({});

    useImperativeHandle(ref, () => ({
        triggerHit: (playerId, rating, combo, score) => {
            setVisualStates(prev => {
                const current = prev[playerId] || { id: playerId, score: 0, combo: 0, lastRating: null, ratingId: 0 };
                // Only update if changed
                return {
                    ...prev,
                    [playerId]: {
                        id: playerId,
                        score,
                        combo,
                        lastRating: rating,
                        ratingId: current.ratingId + 1
                    }
                };
            });
        }
    }));

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'row', // Horizontal!
            alignItems: 'center',
            gap: 4 // Space between players
        }}>
            {players.map(p => {
                const state = visualStates[p.id] || { id: p.id, score: 0, combo: 0, lastRating: null, ratingId: 0 };
                return <PlayerScoreDisplay key={p.id} config={p} state={state} />;
            })}
        </Box>
    );
});
