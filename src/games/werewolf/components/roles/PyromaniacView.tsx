import React, { useState } from 'react';
import { Box, Typography, Button, Grid } from '@mui/material';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import { useTranslation } from 'react-i18next';
import type { Player, NightAction } from '../../logic/types';

interface RoleViewProps {
    players: Player[];
    onAction: (action: NightAction) => void;
    onSkip: () => void;
    instruction?: string;
}

export const PyromaniacView: React.FC<RoleViewProps> = ({ players, onAction, onSkip, instruction }) => {
    const { t } = useTranslation();
    const [action, setAction] = useState<'OIL' | 'BURN' | null>(null);
    const [selected, setSelected] = useState<string[]>([]);

    if (action === 'OIL') {
        return (
            <Box textAlign="center">
                <Typography variant="h6">{instruction || t('games.werewolf.ui.pyromaniac.instruction_oil')}</Typography>
                <Grid container spacing={1} sx={{ mt: 2, mb: 4 }}>
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
                <Button variant="contained" disabled={selected.length !== 2} onClick={() => onAction({ type: 'OIL', targetIds: selected })}>{t('common.next')}</Button>
                <Button sx={{ ml: 2 }} onClick={() => setAction(null)}>{t('common.back')}</Button>
            </Box>
        );
    }

    return (
        <Box textAlign="center">
            <LocalFireDepartmentIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
            <Typography variant="h5">{t('games.werewolf.roles.PYROMANIAC')}</Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
                <Button variant="contained" onClick={() => setAction('OIL')}>{t('games.werewolf.ui.pyromaniac.oil_action')}</Button>
                <Button variant="contained" color="error" onClick={() => onAction({ type: 'BURN' })}>{t('games.werewolf.ui.pyromaniac.burn_action')}</Button>
            </Box>
            <Button sx={{ mt: 4, display: 'block', mx: 'auto' }} onClick={onSkip}>{t('common.skip')}</Button>
        </Box>
    );
};
