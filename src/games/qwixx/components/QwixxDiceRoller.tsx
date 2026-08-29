import React, { useState } from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import { useTranslation } from 'react-i18next';
import type { DiceValues } from '../logic/types';
import type { DieKey } from '../logic/diceHighlight';

interface QwixxDiceRollerProps {
    dice: DiceValues;
    isRolling: boolean;
    onRoll: (dice: DiceValues) => void;
    onDieClick?: (dieKey: DieKey) => void;
    selectedDie?: DieKey | null;
    disabled?: boolean;
}

const DIE_COLORS = {
    white1: { bg: '#ffffff', text: '#212121', border: '#e0e0e0' },
    white2: { bg: '#ffffff', text: '#212121', border: '#e0e0e0' },
    red: { bg: '#d32f2f', text: '#ffffff', border: '#b71c1c' },
    yellow: { bg: '#fbc02d', text: '#212121', border: '#f57f17' },
    green: { bg: '#388e3c', text: '#ffffff', border: '#1b5e20' },
    blue: { bg: '#1976d2', text: '#ffffff', border: '#0d47a1' }
};

export const QwixxDiceRoller: React.FC<QwixxDiceRollerProps> = ({
    dice,
    isRolling,
    onRoll,
    onDieClick,
    selectedDie = null,
    disabled = false
}) => {
    const { t } = useTranslation();
    const [animating, setAnimating] = useState(false);

    const handleRollClick = () => {
        if (disabled || isRolling || animating) return;

        setAnimating(true);
        // Play quick rolling animation sequence
        const interval = setInterval(() => {
            // intermediate random flash
        }, 60);

        setTimeout(() => {
            clearInterval(interval);
            const newDice: DiceValues = {
                white1: Math.floor(Math.random() * 6) + 1,
                white2: Math.floor(Math.random() * 6) + 1,
                red: Math.floor(Math.random() * 6) + 1,
                yellow: Math.floor(Math.random() * 6) + 1,
                green: Math.floor(Math.random() * 6) + 1,
                blue: Math.floor(Math.random() * 6) + 1
            };
            setAnimating(false);
            onRoll(newDice);
        }, 500);
    };

    const whiteSum = dice.white1 + dice.white2;

    const renderDie = (key: keyof DiceValues, val: number) => {
        const c = DIE_COLORS[key];
        const isSelected = selectedDie === key;
        const isClickable = !animating && !isRolling && !!onDieClick;
        return (
            <Paper
                key={key}
                elevation={animating ? 8 : (isSelected ? 6 : 4)}
                onClick={() => isClickable && onDieClick(key)}
                sx={{
                    width: { xs: 40, sm: 52 },
                    height: { xs: 40, sm: 52 },
                    borderRadius: 2,
                    bgcolor: c.bg,
                    color: c.text,
                    border: `2px solid ${isSelected ? '#ffd54f' : c.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: { xs: '1.25rem', sm: '1.6rem' },
                    fontWeight: '900',
                    boxShadow: isSelected ? '0 0 10px 2px rgba(255, 213, 79, 0.7)' : 3,
                    transform: animating ? 'rotate(-6deg) scale(1.08)' : (isSelected ? 'scale(1.1)' : 'none'),
                    transition: 'all 0.15s ease',
                    cursor: isClickable ? 'pointer' : 'default',
                    '&:active': isClickable ? { transform: 'scale(0.95)' } : {}
                }}
            >
                {val}
            </Paper>
        );
    };

    return (
        <Paper
            elevation={3}
            sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 3,
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(8px)',
                mb: 2
            }}
        >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                {/* Dice Row */}
                <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5 }, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', gap: 1, p: 0.5, bgcolor: 'rgba(255, 255, 255, 0.08)', borderRadius: 2 }}>
                        {renderDie('white1', dice.white1)}
                        {renderDie('white2', dice.white2)}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {renderDie('red', dice.red)}
                        {renderDie('yellow', dice.yellow)}
                        {renderDie('green', dice.green)}
                        {renderDie('blue', dice.blue)}
                    </Box>
                </Box>

                {/* Roll Button & White Sum Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 'auto' }}>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                            {t('games.qwixx.white_sum', 'White Sum (All)')}
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" color="primary">
                            {whiteSum}
                        </Typography>
                    </Box>

                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<CasinoIcon />}
                        onClick={handleRollClick}
                        disabled={disabled || isRolling || animating}
                        sx={{
                            fontWeight: 'bold',
                            px: { xs: 2, sm: 3 },
                            py: 1,
                            borderRadius: 2
                        }}
                    >
                        {animating ? t('games.qwixx.rolling', 'Rolling...') : t('games.qwixx.roll', 'Roll')}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
};
