import React, { useState } from 'react';
import { Box, TextField, Button, List, ListItem, ListItemText, IconButton, Paper, Typography, FormControlLabel, Checkbox, Grid, Alert, Dialog } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import type { Player, Role, RoleDefinition } from '../logic/types';
import { useTranslation } from 'react-i18next';
import SettingsIcon from '@mui/icons-material/Settings';
import { RoleEditor } from './RoleEditor';
import { DEFAULT_ROLES } from '../logic/defaultRoles';

interface GameSetupProps {
    players: Player[];
    customRoles: RoleDefinition[];
    onAddPlayer: (name: string) => void;
    onRemovePlayer: (id: string) => void;
    onStartGame: (roles: Role[]) => void;
    onSaveCustomRoles: (roles: RoleDefinition[]) => void;
}

// Derived from DEFAULT_ROLES to avoid duplication
const SPECIAL_ROLES = DEFAULT_ROLES.map(r => r.id as Role);

export const GameSetup: React.FC<GameSetupProps> = ({ players, customRoles = [], onAddPlayer, onRemovePlayer, onStartGame, onSaveCustomRoles }) => {
    const { t } = useTranslation();
    const [newName, setNewName] = useState('');
    const [enabledRoles, setEnabledRoles] = useState<Role[]>(['WITCH', 'SEER']);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const handleAdd = () => {
        if (newName.trim()) {
            onAddPlayer(newName.trim());
            setNewName('');
        }
    };

    const toggleRole = (role: Role) => {
        setEnabledRoles(prev =>
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
    };

    const handleStart = () => {
        const playerCount = players.length;
        const roles: Role[] = [...enabledRoles];

        // Ensure we have at least one werewolf if not explicitly chosen
        const hasWolf = roles.some(r => r === 'WEREWOLF' || r === 'BLACK_WEREWOLF' || r === 'WHITE_WEREWOLF');
        if (!hasWolf) {
            roles.push('WEREWOLF');
        }

        // Fill remaining slots with Villagers
        while (roles.length < playerCount) {
            roles.push('VILLAGER');
        }

        // If too many roles selected, we'll just take the first ones up to playerCount
        // (But UI should ideally prevent this)
        const finalRoles = roles.slice(0, playerCount);

        onStartGame(finalRoles);
    };

    const tooManyRoles = enabledRoles.length + 1 > players.length && players.length > 0;

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
            </Paper>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">{t('games.werewolf.role_reveal')}</Typography>
                    <Button
                        startIcon={<SettingsIcon />}
                        size="small"
                        onClick={() => setIsEditorOpen(true)}
                    >
                        {t('games.werewolf.editor.title', 'Editor')}
                    </Button>
                </Box>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    {t('games.werewolf.ui.select_roles_hint', 'Select roles to include:')}
                </Typography>

                {tooManyRoles && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {t('games.werewolf.ui.too_many_roles', 'Too many roles selected for the number of players!')}
                    </Alert>
                )}

                <Grid container spacing={1}>
                    {SPECIAL_ROLES.map(role => {
                        const customDef = customRoles.find(r => r.id === role);
                        const defaultDef = DEFAULT_ROLES.find(r => r.id === role);

                        // Use custom definition if exists, otherwise fall back to default
                        const icon = customDef?.icon || defaultDef?.icon || '❓';
                        const name = customDef?.name || t(`games.werewolf.roles.${role}`);

                        const label = `${icon} ${name}`;

                        return (
                            <Grid size={{ xs: 6 }} key={role}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={enabledRoles.includes(role)}
                                            onChange={() => toggleRole(role)}
                                            size="small"
                                        />
                                    }
                                    label={<Typography variant="body2">{label}</Typography>}
                                />
                            </Grid>
                        );
                    })}
                    {customRoles.map(role => (
                        <Grid size={{ xs: 6 }} key={role.id}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={enabledRoles.includes(role.id)}
                                        onChange={() => toggleRole(role.id)}
                                        size="small"
                                    />
                                }
                                label={<Typography variant="body2">{role.icon} {role.name}</Typography>}
                            />
                        </Grid>
                    ))}
                </Grid>
            </Paper>

            <Dialog open={isEditorOpen} onClose={() => setIsEditorOpen(false)} fullScreen>
                <RoleEditor
                    customRoles={customRoles}
                    defaultRoles={DEFAULT_ROLES}
                    onSaveRoles={(roles) => {
                        // We need to separate pure custom roles from overridden defaults if we want to save them efficiently,
                        // but for now, the requirement is to allow editing defaults.
                        // The `onSaveCustomRoles` expects `RoleDefinition[]`.
                        // Game logic should persist these overrides.
                        onSaveCustomRoles(roles);
                        setIsEditorOpen(false);
                    }}
                    onClose={() => setIsEditorOpen(false)}
                />
            </Dialog>

            <Button
                variant="contained"
                size="large"
                fullWidth
                color="secondary"
                disabled={players.length < 3 || tooManyRoles}
                onClick={handleStart}
                startIcon={<PlayArrowIcon />}
            >
                {t('common.start')}
            </Button>
        </Box>
    );
};
