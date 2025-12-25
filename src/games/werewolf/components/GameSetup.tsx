import React, { useState } from 'react';
import { Box, TextField, Button, List, ListItem, ListItemText, IconButton, Paper, Typography, Switch, FormControlLabel } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import type { Player, Role } from '../logic/types';
import { useTranslation } from 'react-i18next';

interface GameSetupProps {
    players: Player[];
    onAddPlayer: (name: string) => void;
    onRemovePlayer: (id: string) => void;
    onStartGame: (roles: Role[], isNarratorMode: boolean) => void;
}

export const GameSetup: React.FC<GameSetupProps> = ({ players, onAddPlayer, onRemovePlayer, onStartGame }) => {
    const { t } = useTranslation();
    const [newName, setNewName] = useState('');
    const [useNarrator, setUseNarrator] = useState(true);

    const handleAdd = () => {
        if (newName.trim()) {
            onAddPlayer(newName.trim());
            setNewName('');
        }
    };

    const handleStart = () => {
        // MVP: Minimal roles for testing. 1 Wolf, rest Villagers.
        const roles: Role[] = ['WEREWOLF'];
        const playerCountForRoles = players.length; // Everyone gets a role now
        const villagerCount = playerCountForRoles - 1;

        for (let i = 0; i < villagerCount; i++) roles.push('VILLAGER');

        onStartGame(roles, useNarrator);
    };

    return (
        <Box maxWidth="sm" mx="auto">
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h5" gutterBottom>{t('common.players')}</Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                        fullWidth
                        label={t('games.werewolf.ui.player_name')}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <Button variant="contained" onClick={handleAdd} startIcon={<PersonAddIcon />}>
                        {t('games.werewolf.ui.add')}
                    </Button>
                </Box>

                <List dense sx={{ mb: 2 }}>
                    {players.map(player => (
                        <ListItem
                            key={player.id}
                            secondaryAction={
                                <IconButton edge="end" aria-label="delete" onClick={() => onRemovePlayer(player.id)}>
                                    <DeleteIcon />
                                </IconButton>
                            }
                        >
                            <ListItemText primary={player.name} />
                        </ListItem>
                    ))}
                    {players.length === 0 && (
                        <Typography variant="body2" color="text.secondary" align="center">
                            {t('games.werewolf.ui.add_players_hint')}
                        </Typography>
                    )}
                </List>

                <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2, mt: 2 }}>
                    <FormControlLabel
                        control={<Switch checked={useNarrator} onChange={(e) => setUseNarrator(e.target.checked)} />}
                        label={t('games.werewolf.ui.narrator_mode')}
                    />
                </Box>
            </Paper>

            <Button
                variant="contained"
                size="large"
                fullWidth
                color="secondary"
                disabled={players.length < 3}
                onClick={handleStart}
                startIcon={<PlayArrowIcon />}
            >
                {t('common.start')}
            </Button>
        </Box>
    );
};
