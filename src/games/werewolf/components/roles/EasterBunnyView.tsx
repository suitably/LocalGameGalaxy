import React, { useState } from 'react';
import { Box, Typography, Button, Grid } from '@mui/material';
import EggIcon from '@mui/icons-material/Egg';
import { useTranslation } from 'react-i18next';
import type { Player, NightAction } from '../../logic/types';

interface RoleViewProps {
    players: Player[];
    onAction: (action: NightAction) => void;
    onSkip: () => void;
    instruction?: string;
}

export const EasterBunnyView: React.FC<RoleViewProps> = ({ players, onAction, onSkip, instruction }) => {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<string[]>([]);
    return (
        <Box textAlign="center">
            <EggIcon sx={{ fontSize: 80, color: 'orange', mb: 2 }} />
            <Typography variant="h5">{t('games.werewolf.roles.EASTER_BUNNY')}</Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>{instruction || t('games.werewolf.ui.easter_bunny.instruction')}</Typography>
            <Grid container spacing={1} sx={{ mb: 4 }}>
                {players.filter(p => p.isAlive).map(p => (
                    <Grid size={{ xs: 6 }} key={p.id}>
                        <Button
                            fullWidth
                            variant={selected.includes(p.id) ? "contained" : "outlined"}
                            onClick={() => {
                                if (selected.includes(p.id)) setSelected(selected.filter(i => i !== p.id));
                                else if (selected.length < 2) setSelected([...selected, p.id]);
                            }}
                        >
                            {p.name}
                        </Button>
                    </Grid>
                ))}
            </Grid>
            <Button
                variant="contained"
                size="large"
                fullWidth
                disabled={selected.length !== 2}
                onClick={() => onAction({ type: 'GIVE_EGG', targetIds: selected })}
            >
                {t('common.next')}
            </Button>
            <Button sx={{ mt: 2 }} onClick={onSkip}>{t('common.skip')}</Button>
        </Box>
    );
};
