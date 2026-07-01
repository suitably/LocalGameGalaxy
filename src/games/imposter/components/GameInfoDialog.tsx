import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { useTranslation } from 'react-i18next';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CircleIcon from '@mui/icons-material/Circle';

interface GameInfoDialogProps {
    open: boolean;
    onClose: () => void;
}

export const GameInfoDialog: React.FC<GameInfoDialogProps> = ({ open, onClose }) => {
    const { t } = useTranslation();

    // Get the rules array from translations
    const rules = t('games.imposter.info.rules', { returnObjects: true }) as string[];

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    background: 'rgba(25, 25, 35, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
                <InfoOutlinedIcon color="primary" />
                <Typography variant="h5" component="span" fontWeight="bold">
                    {t('games.imposter.info.title', 'How to play')}
                </Typography>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <List sx={{ py: 0 }}>
                    {Array.isArray(rules) ? rules.map((rule, idx) => (
                        <ListItem key={idx} alignItems="flex-start" sx={{ px: 0, py: 1 }}>
                            <ListItemIcon sx={{ minWidth: 28, mt: 0.5 }}>
                                <CircleIcon sx={{ fontSize: 8, color: 'primary.main' }} />
                            </ListItemIcon>
                            <ListItemText
                                primary={rule}
                                primaryTypographyProps={{ variant: 'body1', color: 'text.primary', lineHeight: 1.6 }}
                            />
                        </ListItem>
                    )) : null}
                </List>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button
                    onClick={onClose}
                    variant="contained"
                    size="large"
                    fullWidth
                    sx={{ borderRadius: 2 }}
                >
                    {t('games.imposter.info.got_it', 'Got it!')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
