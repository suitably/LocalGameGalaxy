import React, { useState } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface HandoverViewProps {
    playerName: string;
    isImposter: boolean;
    word: string;
    hint: string;
    onConfirmed: () => void;
}

export const HandoverView: React.FC<HandoverViewProps> = ({ playerName, isImposter, word, hint, onConfirmed }) => {
    const { t } = useTranslation();
    const [isRevealed, setIsRevealed] = useState(false);

    return (
        <Box sx={{ maxWidth: 'sm', mx: 'auto', textAlign: 'center', py: 5 }}>
            {!isRevealed ? (
                <Paper sx={{ p: 4, borderRadius: 3, bgcolor: 'rgba(30, 30, 40, 0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 6 }}>
                    <Typography variant="h5" gutterBottom>
                        {t('games.imposter.handover.pass_to', { name: playerName })}
                    </Typography>
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<VisibilityIcon />}
                        onClick={() => setIsRevealed(true)}
                        sx={{ mt: 3 }}
                    >
                        {t('games.werewolf.reveal_role')}
                    </Button>
                </Paper>
            ) : (
                <Paper sx={{ p: 6, borderRadius: 3, bgcolor: isImposter ? 'rgba(211, 47, 47, 0.85)' : 'rgba(56, 142, 60, 0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: 8 }}>
                    {isImposter ? (
                        <>
                            <Typography variant="h4" color="error.contrastText" gutterBottom sx={{ fontWeight: 'bold' }}>
                                {t('games.imposter.handover.you_are_imposter')}
                            </Typography>
                            <Typography variant="h6" color="error.contrastText">
                                {t('games.imposter.handover.imposter_hint', { hint })}
                            </Typography>
                        </>
                    ) : (
                        <>
                            <Typography variant="h6" color="success.contrastText">
                                {t('games.imposter.handover.your_word')}
                            </Typography>
                            <Typography variant="h3" color="success.contrastText" sx={{ my: 2, fontWeight: 'bold' }}>
                                {word}
                            </Typography>
                        </>
                    )
                    }
                    <Button
                        variant="contained"
                        color="inherit"
                        size="large"
                        startIcon={<CheckCircleOutlineIcon />}
                        onClick={onConfirmed}
                        sx={{ mt: 4 }}
                    >
                        {t('games.imposter.handover.understood')}
                    </Button>
                </Paper>
            )}
        </Box>
    );
};
