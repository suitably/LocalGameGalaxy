import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { SavedGameInfo } from '../hooks/useGameStatePersistence';

interface ContinueGameDialogProps {
    open: boolean;
    savedGameInfo: SavedGameInfo | null;
    onContinue: () => void;
    onNewGame: () => void;
}

export const ContinueGameDialog: React.FC<ContinueGameDialogProps> = ({
    open,
    savedGameInfo,
    onContinue,
    onNewGame
}) => {
    const { t } = useTranslation();

    if (!savedGameInfo) return null;

    return (
        <Dialog open={open} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ textAlign: 'center' }}>
                {t('games.werewolf.continue.title')}
            </DialogTitle>
            <DialogContent>
                <Typography variant="body1" sx={{ mb: 2, textAlign: 'center' }}>
                    {t('games.werewolf.continue.message')}
                </Typography>
                <Box sx={{
                    bgcolor: 'action.hover',
                    borderRadius: 2,
                    p: 2,
                    textAlign: 'center'
                }}>
                    <Typography variant="body2" color="text.secondary">
                        {t('games.werewolf.continue.round', { round: savedGameInfo.round })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('games.werewolf.continue.phase', { phase: savedGameInfo.phase })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('games.werewolf.continue.players', { count: savedGameInfo.playerCount })}
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 3 }}>
                <Button
                    variant="outlined"
                    onClick={onNewGame}
                    color="secondary"
                >
                    {t('games.werewolf.continue.new_game')}
                </Button>
                <Button
                    variant="contained"
                    onClick={onContinue}
                    color="primary"
                >
                    {t('games.werewolf.continue.continue_game')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
