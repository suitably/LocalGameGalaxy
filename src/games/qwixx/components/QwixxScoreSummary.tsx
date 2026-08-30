import React from 'react';
import { Box, Paper, Typography, ButtonBase, Chip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useTranslation } from 'react-i18next';
import type { PlayerSheet } from '../logic/types';
import { calculateTotalScore } from '../logic/qwixxReducer';
import { getSheetDefinition } from '../logic/sheetDefinitions';

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
    const sheetDef = getSheetDefinition(sheet.sheetType || 'classic');

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
            {/* Sheet Type Badge & Lucky Numbers */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight="bold">
                        {t('games.qwixx.mode_label', 'Modus:')}
                    </Typography>
                    <Chip
                        size="small"
                        label={t(sheetDef.nameKey)}
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 'bold' }}
                    />
                </Box>

                {sheet.sheetType === 'longo' && sheet.luckyNumbers && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
                            🍀 {t('games.qwixx.lucky_numbers', 'Glückszahlen')}:
                        </Typography>
                        <Chip label={sheet.luckyNumbers[0]} size="small" sx={{ bgcolor: 'rgba(0, 229, 255, 0.2)', color: '#00e5ff', border: '1px solid #00e5ff', fontWeight: 'bold', height: 22 }} />
                        <Chip label={sheet.luckyNumbers[1]} size="small" sx={{ bgcolor: 'rgba(0, 229, 255, 0.2)', color: '#00e5ff', border: '1px solid #00e5ff', fontWeight: 'bold', height: 22 }} />
                    </Box>
                )}
            </Box>

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
                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(211, 47, 47, 0.25)', border: '1px solid #d32f2f', textAlign: 'center', minWidth: 48 }}>
                        <Typography variant="caption" sx={{ color: '#ef5350', display: 'block', fontWeight: 'bold' }}>{t('games.qwixx.red', 'Red')}</Typography>
                        <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 'bold' }}>{scores.red}</Typography>
                    </Box>

                    <Typography variant="h6" color="text.secondary">+</Typography>

                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(251, 192, 45, 0.25)', border: '1px solid #fbc02d', textAlign: 'center', minWidth: 48 }}>
                        <Typography variant="caption" sx={{ color: '#ffee58', display: 'block', fontWeight: 'bold' }}>{t('games.qwixx.yellow', 'Yellow')}</Typography>
                        <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 'bold' }}>{scores.yellow}</Typography>
                    </Box>

                    <Typography variant="h6" color="text.secondary">+</Typography>

                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(56, 142, 60, 0.25)', border: '1px solid #388e3c', textAlign: 'center', minWidth: 48 }}>
                        <Typography variant="caption" sx={{ color: '#66bb6a', display: 'block', fontWeight: 'bold' }}>{t('games.qwixx.green', 'Green')}</Typography>
                        <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 'bold' }}>{scores.green}</Typography>
                    </Box>

                    <Typography variant="h6" color="text.secondary">+</Typography>

                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(25, 118, 210, 0.25)', border: '1px solid #1976d2', textAlign: 'center', minWidth: 48 }}>
                        <Typography variant="caption" sx={{ color: '#42a5f5', display: 'block', fontWeight: 'bold' }}>{t('games.qwixx.blue', 'Blue')}</Typography>
                        <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 'bold' }}>{scores.blue}</Typography>
                    </Box>

                    {/* Optional Stairs Bonus (Connected Stairs) */}
                    {scores.stairsBonus !== undefined && (
                        <>
                            <Typography variant="h6" color="text.secondary">+</Typography>
                            <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(255, 215, 0, 0.2)', border: '1px solid #ffd700', textAlign: 'center', minWidth: 52 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
                                    <EmojiEventsIcon sx={{ fontSize: '0.85rem', color: '#ffd700' }} />
                                    <Typography variant="caption" sx={{ color: '#ffd700', fontWeight: 'bold' }}>{t('games.qwixx.stairs', 'Treppe')}</Typography>
                                </Box>
                                <Typography variant="h6" sx={{ color: '#ffd700', fontWeight: 'bold' }}>{scores.stairsBonus}</Typography>
                            </Box>
                        </>
                    )}

                    <Typography variant="h6" color="text.secondary">-</Typography>

                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)', textAlign: 'center', minWidth: 48 }}>
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
