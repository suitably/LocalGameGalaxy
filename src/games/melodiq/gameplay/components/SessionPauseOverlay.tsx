import React from 'react';
import { ScoreBoard } from '../ScoreBoard';
import { type PlayerRuntime } from '../hooks/PlayerRuntime';

export interface SessionPauseOverlayProps {
    isPausedForScore: boolean;
    suppressResults?: boolean;
    players: PlayerRuntime[];
    onExit: (forceHome?: boolean) => void;
    onResume: () => void;
    setIsPausedForScore: (paused: boolean) => void;
}

export const SessionPauseOverlay: React.FC<SessionPauseOverlayProps> = ({
    isPausedForScore,
    suppressResults = false,
    players,
    onExit,
    onResume,
    setIsPausedForScore
}) => {
    if (!isPausedForScore || suppressResults) return null;

    const pausedPlayers = players.map(p => ({
        config: p.config,
        score: Math.round(p.trackScores[p.trackIndex] || 0),
        history: [],
        isNewRecord: false
    }));

    return (
        <ScoreBoard
            players={pausedPlayers}
            onExit={(forceHome) => {
                setIsPausedForScore(false);
                onExit(forceHome);
            }}
            onResume={onResume}
        />
    );
};
