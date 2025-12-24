import React, { useState } from 'react';
import { Box, TextField, Button, List, ListItem, ListItemText, IconButton, Paper, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import type { Player, Role } from '../logic/types';
import { useTranslation } from 'react-i18next';

interface GameSetupProps {
    players: Player[];
    onAddPlayer: (name: string) => void;
    onRemovePlayer: (id: string) => void;
    onStartGame: (roles: Role[]) => void;
}

export const GameSetup: React.FC<GameSetupProps> = ({ players, onAddPlayer, onRemovePlayer, onStartGame }) => {
    const { t } = useTranslation();
    const [newName, setNewName] = useState('');

    const handleAdd = () => {
        if (newName.trim()) {
            onAddPlayer(newName.trim());
            setNewName('');
        }
    };

    const handleStart = () => {
        // MVP: Minimal roles for testing. 1 Wolf, rest Villagers.
        // In real app, we would have role selection UI
        const roles: Role[] = ['WEREWOLF'];
        const villagerCount = players.length - 1;
        for (let i = 0; i < villagerCount; i++) roles.push('VILLAGER');

        onStartGame(roles);
    };

    return (
        <Box maxWidth="sm" mx="auto">
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h5" gutterBottom>{t('common.players')}</Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                        fullWidth
                        label="Player Name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <Button variant="contained" onClick={handleAdd} startIcon={<PersonAddIcon />}>
                        Add
                    </Button>
                </Box>

                <List dense>
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
                            Add at least 3 players to start.
                        </Typography>
                    )}
                </List>
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
