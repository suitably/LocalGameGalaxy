import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, List, ListItem, ListItemText, IconButton, Paper, Typography, FormControlLabel, Checkbox, Grid, Alert, Dialog } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import type { Player, Role, RoleDefinition } from '../logic/types';
import { useTranslation } from 'react-i18next';
import SettingsIcon from '@mui/icons-material/Settings';
import { RoleEditor } from './RoleEditor';
import { DEFAULT_ROLES } from '../logic/defaultRoles';
import { isWerewolfRole } from '../logic/utils';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

const STORAGE_KEY_SETTINGS = 'werewolf-setup-settings';

interface GameSetupProps {
    players: Player[];
    customRoles: RoleDefinition[];
    onAddPlayer: (name: string) => void;
    onRemovePlayer: (id: string) => void;
    onClearAllPlayers: () => void;
    onStartGame: (roles: Role[]) => void;
    onSaveCustomRoles: (roles: RoleDefinition[]) => void;
}

// Derived from DEFAULT_ROLES to avoid duplication, but exclude base WEREWOLF
const SPECIAL_ROLES = DEFAULT_ROLES.filter(r => r.id !== 'WEREWOLF').map(r => r.id as Role);

export const GameSetup: React.FC<GameSetupProps> = ({ players, customRoles = [], onAddPlayer, onRemovePlayer, onClearAllPlayers, onStartGame, onSaveCustomRoles }) => {
    const { t } = useTranslation();
    const [newName, setNewName] = useState('');

    // Load settings from localStorage
    const [enabledRoles, setEnabledRoles] = useState<Role[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.enabledRoles) return parsed.enabledRoles;
            }
        } catch { }
        return ['WITCH', 'SEER'];
    });
    const [numWerewolves, setNumWerewolves] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.numWerewolves ?? 1;
            }
        } catch { }
        return 1;
    });
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    // Save settings to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify({
            enabledRoles,
            numWerewolves
        }));
    }, [enabledRoles, numWerewolves]);

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
        const allAvailableRoles = [...DEFAULT_ROLES, ...customRoles];
        const selectedWerewolfRoles = enabledRoles.filter(roleId => isWerewolfRole(roleId, allAvailableRoles));

        const roles: Role[] = [...enabledRoles];

        // Add standard werewolves to reach the desired count
        const wolvesToAdd = Math.max(0, numWerewolves - selectedWerewolfRoles.length);
        for (let i = 0; i < wolvesToAdd; i++) {
            roles.push('WEREWOLF');
        }

        // Fill remaining slots with Villagers
        while (roles.length < playerCount) {
            roles.push('VILLAGER');
        }

        const finalRoles = roles.slice(0, playerCount);
        onStartGame(finalRoles);
    };

    const allAvailableRoles = [...DEFAULT_ROLES, ...customRoles];
    const selectedWerewolfRolesCount = enabledRoles.filter(roleId => isWerewolfRole(roleId, allAvailableRoles)).length;
    const tooManyWerewolves = selectedWerewolfRolesCount > numWerewolves;

    // Total roles chosen so far (excluding villagers who are added automatically)
    // base werewolves = numWerewolves - selectedWerewolfRolesCount (min 0)
    const baseWerewolvesToAdd = Math.max(0, numWerewolves - selectedWerewolfRolesCount);
    const totalRolesCount = enabledRoles.length + baseWerewolvesToAdd;
    const tooManyRoles = totalRolesCount > players.length && players.length > 0;

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
                {players.length > 0 && (
                    <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<ClearAllIcon />}
                        onClick={onClearAllPlayers}
                        sx={{ mt: 1 }}
                    >
                        {t('common.clear_all_players')}
                    </Button>
                )}
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

                {tooManyWerewolves && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {t('games.werewolf.ui.too_many_werewolf_roles')}
                    </Alert>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                    <Typography variant="body1" sx={{ flexGrow: 1 }}>
                        🐺 {t('games.werewolf.ui.num_werewolves')}:
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <IconButton
                            size="small"
                            onClick={() => setNumWerewolves((prev: number) => Math.max(1, prev - 1))}
                            disabled={numWerewolves <= 1}
                        >
                            <RemoveIcon />
                        </IconButton>
                        <Typography sx={{ mx: 2, minWidth: '1.5rem', textAlign: 'center' }}>
                            {numWerewolves}
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={() => setNumWerewolves((prev: number) => prev + 1)}
                            disabled={numWerewolves >= players.length - 1 && players.length > 0}
                        >
                            <AddIcon />
                        </IconButton>
                    </Box>
                </Box>

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
                disabled={players.length < 3 || tooManyRoles || tooManyWerewolves}
                onClick={handleStart}
                startIcon={<PlayArrowIcon />}
            >
                {t('common.start')}
            </Button>
        </Box>
    );
};
