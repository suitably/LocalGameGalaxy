import React from 'react';
import { Box, Paper, Typography, ButtonBase } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import type { PlayerSheet } from '../logic/types';
import { calculateTotalScore } from '../logic/qwixxReducer';

interface QwixxScoreSummaryProps {
    sheet: PlayerSheet;
    onAddMiss: () => void;
    onRemoveMiss: () => void;
    disabled?: boolean;
}

export const QwixxScoreSummary: React.FC<QwixxScoreSummaryProps> = ({
    sheet,
    onAddMiss,
    onRemoveMiss,
    disabled = false
}) => {
    const { t } = useTranslation();
    const scores = calculateTotalScore(sheet);

    return (
        <Paper
            elevation={4}
            sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 3,
                bgcolor: 'rgba(30, 30, 45, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                mt: 2
            }}
        >
            {/* Row Point Breakdown */}
            <Box
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5
                }}
            >
                {/* Points Formula Overview */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(211, 47, 47, 0.25)', border: '1px solid #d32f2f', textAlign: 'center', minWidth: 50 }}>
                        <Typography variant="caption" sx={{ color: '#ef5350', display: 'block', fontWeight: 'bold' }}>{t('games.qwixx.red', 'Red')}</Typography>
                        <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 'bold' }}>{scores.red}</Typography>
                    </Box>

                    <Typography variant="h6" color="text.secondary">+</Typography>

                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(251, 192, 45, 0.25)', border: '1px solid #fbc02d', textAlign: 'center', minWidth: 50 }}>
                        <Typography variant="caption" sx={{ color: '#ffee58', display: 'block', fontWeight: 'bold' }}>{t('games.qwixx.yellow', 'Yellow')}</Typography>
                        <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 'bold' }}>{scores.yellow}</Typography>
                    </Box>

                    <Typography variant="h6" color="text.secondary">+</Typography>

                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(56, 142, 60, 0.25)', border: '1px solid #388e3c', textAlign: 'center', minWidth: 50 }}>
                        <Typography variant="caption" sx={{ color: '#66bb6a', display: 'block', fontWeight: 'bold' }}>{t('games.qwixx.green', 'Green')}</Typography>
                        <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 'bold' }}>{scores.green}</Typography>
                    </Box>

                    <Typography variant="h6" color="text.secondary">+</Typography>

                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(25, 118, 210, 0.25)', border: '1px solid #1976d2', textAlign: 'center', minWidth: 50 }}>
                        <Typography variant="caption" sx={{ color: '#42a5f5', display: 'block', fontWeight: 'bold' }}>{t('games.qwixx.blue', 'Blue')}</Typography>
                        <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 'bold' }}>{scores.blue}</Typography>
                    </Box>

                    <Typography variant="h6" color="text.secondary">-</Typography>

                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)', textAlign: 'center', minWidth: 50 }}>
                        <Typography variant="caption" color="error.light" sx={{ display: 'block', fontWeight: 'bold' }}>{t('games.qwixx.misses', 'Misses')}</Typography>
                        <Typography variant="h6" color="error.light" sx={{ fontWeight: 'bold' }}>{scores.missesPenalty}</Typography>
                    </Box>

                    <Typography variant="h6" color="text.secondary">=</Typography>

                    {/* Total Score Badge */}
                    <Box sx={{ p: 1, px: 2, borderRadius: 2, bgcolor: 'primary.main', textAlign: 'center', minWidth: 70, boxShadow: 3 }}>
                        <Typography variant="caption" sx={{ color: '#ffffff', display: 'block', fontWeight: 'bold' }}>{t('games.qwixx.total', 'TOTAL')}</Typography>
                        <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: '900' }}>{scores.total}</Typography>
                    </Box>
                </Box>

                {/* Misses Checkboxes */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight="bold">
                        {t('games.qwixx.misses_label', 'Misses (-5):')}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.75 }}>
                        {[1, 2, 3, 4].map((index) => {
                            const isMissed = sheet.misses >= index;
                            return (
                                <ButtonBase
                                    key={index}
                                    onClick={() => {
                                        if (disabled) return;
                                        if (isMissed && sheet.misses === index) {
                                            onRemoveMiss();
                                        } else if (!isMissed && sheet.misses === index - 1) {
                                            onAddMiss();
                                        }
                                    }}
                                    disabled={disabled}
                                    sx={{
                                        width: { xs: 28, sm: 34 },
                                        height: { xs: 28, sm: 34 },
                                        borderRadius: 1.5,
                                        border: '2px solid rgba(255, 255, 255, 0.4)',
                                        bgcolor: isMissed ? '#d32f2f' : 'rgba(255, 255, 255, 0.05)',
                                        color: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {isMissed ? <CloseIcon sx={{ fontSize: 20 }} /> : null}
                                </ButtonBase>
                            );
                        })}
                    </Box>
                </Box>
            </Box>
        </Paper>
    );
};
