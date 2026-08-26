import React from 'react';
import { Box, ButtonBase, Paper } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import CloseIcon from '@mui/icons-material/Close';
import type { RowColor, RowState } from '../logic/types';
import { ROW_NUMBERS, canCrossNumber, canUncrossNumber } from '../logic/qwixxReducer';

interface QwixxRowProps {
    color: RowColor;
    rowState: RowState;
    onCrossNumber: (color: RowColor, number: number) => void;
    onLockRow: (color: RowColor) => void;
    onUnlockRow: (color: RowColor) => void;
    disabled?: boolean;
}

const ROW_COLORS: Record<RowColor, { bg: string; border: string; text: string; buttonBg: string; buttonCrossed: string }> = {
    red: {
        bg: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)',
        border: '#ef5350',
        text: '#ffffff',
        buttonBg: 'rgba(255, 255, 255, 0.9)',
        buttonCrossed: '#b71c1c'
    },
    yellow: {
        bg: 'linear-gradient(135deg, #fbc02d 0%, #f57f17 100%)',
        border: '#ffee58',
        text: '#212121',
        buttonBg: 'rgba(255, 255, 255, 0.95)',
        buttonCrossed: '#e65100'
    },
    green: {
        bg: 'linear-gradient(135deg, #388e3c 0%, #1b5e20 100%)',
        border: '#66bb6a',
        text: '#ffffff',
        buttonBg: 'rgba(255, 255, 255, 0.9)',
        buttonCrossed: '#1b5e20'
    },
    blue: {
        bg: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
        border: '#42a5f5',
        text: '#ffffff',
        buttonBg: 'rgba(255, 255, 255, 0.9)',
        buttonCrossed: '#0d47a1'
    }
};

export const QwixxRow: React.FC<QwixxRowProps> = ({
    color,
    rowState,
    onCrossNumber,
    onLockRow,
    onUnlockRow,
    disabled = false
}) => {
    const numbers = ROW_NUMBERS[color];
    const colors = ROW_COLORS[color];
    const lastNumber = numbers[numbers.length - 1];
    const canLock = rowState.crossed.length >= 5 && rowState.crossed.includes(lastNumber) && !rowState.isLocked;

    return (
        <Paper
            elevation={3}
            sx={{
                background: colors.bg,
                border: `2px solid ${colors.border}`,
                borderRadius: 3,
                p: { xs: 1, sm: 1.5 },
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 0.5, sm: 1 },
                opacity: rowState.isLocked ? 0.75 : 1,
                boxShadow: 4,
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch'
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flex: 1,
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: { xs: 0.5, sm: 1 },
                    minWidth: { xs: 340, sm: 'auto' }
                }}
            >
                {numbers.map((num) => {
                    const isCrossed = rowState.crossed.includes(num);
                    const isAllowed = canCrossNumber(numbers, rowState.crossed, num);
                    const isUncrossable = canUncrossNumber(rowState.crossed, num);
                    const isClickable = isCrossed ? isUncrossable : isAllowed;
                    const isLast = num === lastNumber;

                    return (
                        <ButtonBase
                            key={num}
                            onClick={() => !disabled && !rowState.isLocked && isClickable && onCrossNumber(color, num)}
                            disabled={disabled || rowState.isLocked || !isClickable}
                            sx={{
                                width: { xs: 26, sm: 36, md: 44 },
                                height: { xs: 32, sm: 42, md: 50 },
                                borderRadius: 1.5,
                                bgcolor: isCrossed ? colors.buttonCrossed : colors.buttonBg,
                                color: isCrossed ? '#ffffff' : (color === 'yellow' ? '#212121' : '#1e1e24'),
                                fontWeight: '900',
                                fontSize: { xs: '0.85rem', sm: '1.1rem', md: '1.25rem' },
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                                transform: isCrossed ? 'scale(0.96)' : 'none',
                                opacity: !isClickable ? 0.35 : 1,
                                boxShadow: isCrossed ? 'inset 0 2px 4px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.2)',
                                '&:active': {
                                    transform: 'scale(0.92)'
                                }
                            }}
                        >
                            {isCrossed ? (
                                <CloseIcon sx={{ fontSize: { xs: 22, sm: 30, md: 36 }, color: '#ffffff', stroke: '#ffffff', strokeWidth: 1.5 }} />
                            ) : (
                                num
                            )}
                            {isLast && !isCrossed && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 1,
                                        right: 1,
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        bgcolor: colors.border
                                    }}
                                />
                            )}
                        </ButtonBase>
                    );
                })}

                {/* Lock Button */}
                <ButtonBase
                    onClick={() => {
                        if (rowState.isLocked) {
                            onUnlockRow(color);
                        } else if (canLock) {
                            onLockRow(color);
                        }
                    }}
                    disabled={!canLock && !rowState.isLocked}
                    sx={{
                        width: { xs: 28, sm: 38, md: 46 },
                        height: { xs: 32, sm: 42, md: 50 },
                        borderRadius: '50%',
                        bgcolor: rowState.isLocked ? '#ffffff' : (canLock ? colors.buttonBg : 'rgba(255, 255, 255, 0.25)'),
                        color: rowState.isLocked ? (color === 'yellow' ? '#f57f17' : colors.buttonCrossed) : (canLock ? colors.buttonCrossed : 'rgba(255, 255, 255, 0.6)'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: rowState.isLocked ? 3 : 'none',
                        transition: 'all 0.2s ease',
                        animation: canLock ? 'pulse 1.5s infinite' : 'none'
                    }}
                >
                    {rowState.isLocked ? (
                        <LockIcon sx={{ fontSize: { xs: 18, sm: 24, md: 28 } }} />
                    ) : (
                        <LockOpenIcon sx={{ fontSize: { xs: 18, sm: 24, md: 28 } }} />
                    )}
                </ButtonBase>
            </Box>
        </Paper>
    );
};
