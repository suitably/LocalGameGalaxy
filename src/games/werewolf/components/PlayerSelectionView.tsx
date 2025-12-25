import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import type { Player } from '../logic/types';

interface PlayerSelectionViewProps {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    instruction: string;
    players: Player[];
    onSelect: (playerId: string) => void;
    onSkip: () => void;
    skipLabel: string;
    buttonColor: 'primary' | 'error' | 'secondary' | 'info' | 'success' | 'warning';
    extraContent?: React.ReactNode;
    disabled?: boolean;
}

export const PlayerSelectionView: React.FC<PlayerSelectionViewProps> = ({
    icon,
    title,
    subtitle,
    instruction,
    players,
    onSelect,
    onSkip,
    skipLabel,
    buttonColor,
    extraContent,
    disabled
}) => {
    return (
        <Box maxWidth="sm" mx="auto" textAlign="center" mt={4} sx={{ opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
            <Box sx={{ mb: 2 }}>
                {icon}
            </Box>
            <Typography variant="h4" gutterBottom>
                {title}
            </Typography>
            {subtitle && (
                <Typography variant="h6" gutterBottom color="secondary">
                    {subtitle}
                </Typography>
            )}

            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    {instruction}
                </Typography>

                {extraContent}

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: extraContent ? 3 : 0 }}>
                    {players.map(p => (
                        <Button
                            key={p.id}
                            variant="contained"
                            color={buttonColor}
                            onClick={() => onSelect(p.id)}
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
                onClick={onSkip}
                sx={{ mt: 2 }}
                fullWidth
            >
                {skipLabel}
            </Button>
        </Box>
    );
};
