import React, { useState } from 'react';
import { Box, Paper, Typography, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import type { PlayerSheet } from '../logic/types';
import { calculateTotalScore } from '../logic/qwixxReducer';
import { QwixxSheet } from './QwixxSheet';

interface QwixxOpponentViewProps {
    opponents: PlayerSheet[];
}

export const QwixxOpponentView: React.FC<QwixxOpponentViewProps> = ({ opponents }) => {
    const { t } = useTranslation();
    const [selectedOpponent, setSelectedOpponent] = useState<PlayerSheet | null>(null);

    if (opponents.length === 0) return null;

    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VisibilityIcon color="primary" />
                {t('games.qwixx.opponents', 'Opponents')}
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(220px, 1fr))' }, gap: 2 }}>
                {opponents.map((opp) => {
                    const score = calculateTotalScore(opp);
                    return (
                        <Paper
                            key={opp.id}
                            onClick={() => setSelectedOpponent(opp)}
                            elevation={3}
                            sx={{
                                p: 2,
                                borderRadius: 2.5,
                                bgcolor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                    transform: 'translateY(-2px)'
                                }
                            }}
                        >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                    {opp.name}
                                </Typography>
                                <Typography variant="h6" color="primary" fontWeight="900">
                                    {score.total} pts
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 0.5, height: 6, borderRadius: 1, overflow: 'hidden', mb: 1 }}>
                                <Box sx={{ flex: Math.max(1, opp.red.crossed.length), bgcolor: '#d32f2f' }} />
                                <Box sx={{ flex: Math.max(1, opp.yellow.crossed.length), bgcolor: '#fbc02d' }} />
                                <Box sx={{ flex: Math.max(1, opp.green.crossed.length), bgcolor: '#388e3c' }} />
                                <Box sx={{ flex: Math.max(1, opp.blue.crossed.length), bgcolor: '#1976d2' }} />
                            </Box>

                            <Typography variant="caption" color="text.secondary">
                                {t('games.qwixx.tap_to_view', 'Tap to view full sheet')}
                            </Typography>
                        </Paper>
                    );
                })}
            </Box>

            {/* Detailed Sheet Modal */}
            <Dialog
                open={!!selectedOpponent}
                onClose={() => setSelectedOpponent(null)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {selectedOpponent?.name} - {t('games.qwixx.sheet', 'Sheet')}
                    <IconButton onClick={() => setSelectedOpponent(null)} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {selectedOpponent && (
                        <QwixxSheet
                            sheet={selectedOpponent}
                            onCrossNumber={() => {}}
                            onLockRow={() => {}}
                            onAddMiss={() => {}}
                            onRemoveMiss={() => {}}
                            readOnly
                        />
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
};
