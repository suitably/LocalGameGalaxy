import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    TextField,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import { useTranslation } from 'react-i18next';
import type { RoleDefinition, Ability, RoleAlignment } from '../logic/types';

interface RoleEditorProps {
    customRoles: RoleDefinition[];
    onSaveRoles: (roles: RoleDefinition[]) => void;
    onClose: () => void;
}

const EMPTY_ABILITY: Ability = {
    type: 'KILL',
    timing: 'EVERY_NIGHT',
    targetCount: 1,
};

export const RoleEditor: React.FC<RoleEditorProps> = ({ customRoles, onSaveRoles, onClose }) => {
    const { t } = useTranslation();
    const [roles, setRoles] = useState<RoleDefinition[]>(customRoles);
    const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleAddRole = () => {
        setEditingRole({
            id: crypto.randomUUID(),
            name: '',
            description: '',
            icon: '👤',
            alignment: 'VILLAGER',
            abilities: [],
            isCustom: true
        });
        setIsDialogOpen(true);
    };

    const handleEditRole = (role: RoleDefinition) => {
        setEditingRole({ ...role });
        setIsDialogOpen(true);
    };

    const handleDeleteRole = (id: string) => {
        setRoles(prev => prev.filter(r => r.id !== id));
    };

    const handleSaveRole = () => {
        if (editingRole) {
            setRoles(prev => {
                const index = prev.findIndex(r => r.id === editingRole.id);
                if (index > -1) {
                    const newRoles = [...prev];
                    newRoles[index] = editingRole;
                    return newRoles;
                }
                return [...prev, editingRole];
            });
            setIsDialogOpen(false);
            setEditingRole(null);
        }
    };

    const handleAddAbility = () => {
        if (editingRole) {
            setEditingRole({
                ...editingRole,
                abilities: [...editingRole.abilities, { ...EMPTY_ABILITY }]
            });
        }
    };

    const handleUpdateAbility = (index: number, updates: Partial<Ability>) => {
        if (editingRole) {
            const newAbilities = [...editingRole.abilities];
            newAbilities[index] = { ...newAbilities[index], ...updates };
            setEditingRole({ ...editingRole, abilities: newAbilities });
        }
    };

    const handleRemoveAbility = (index: number) => {
        if (editingRole) {
            setEditingRole({
                ...editingRole,
                abilities: editingRole.abilities.filter((_, i) => i !== index)
            });
        }
    };

    return (
        <Box p={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5">{t('games.werewolf.editor.title', 'Role Editor')}</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddRole}>
                    {t('games.werewolf.editor.add_role', 'Add Role')}
                </Button>
            </Box>

            <List component={Paper}>
                {roles.map(role => (
                    <ListItem key={role.id} divider>
                        <ListItemText
                            primary={`${role.icon} ${role.name}`}
                            secondary={role.description}
                        />
                        <ListItemSecondaryAction>
                            <IconButton edge="end" onClick={() => handleEditRole(role)} sx={{ mr: 1 }}>
                                <EditIcon />
                            </IconButton>
                            <IconButton edge="end" onClick={() => handleDeleteRole(role.id)}>
                                <DeleteIcon />
                            </IconButton>
                        </ListItemSecondaryAction>
                    </ListItem>
                ))}
            </List>

            <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
                <Button onClick={onClose}>{t('common.back')}</Button>
                <Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={() => onSaveRoles(roles)}>
                    {t('common.save', 'Save All')}
                </Button>
            </Box>

            <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingRole?.name ? t('games.werewolf.editor.edit_role', 'Edit Role') : t('games.werewolf.editor.new_role', 'New Role')}</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            label={t('games.werewolf.ui.player_name')}
                            value={editingRole?.name || ''}
                            onChange={e => setEditingRole(prev => prev ? { ...prev, name: e.target.value } : null)}
                            fullWidth
                        />
                        <TextField
                            label={t('games.werewolf.description', 'Description')}
                            value={editingRole?.description || ''}
                            onChange={e => setEditingRole(prev => prev ? { ...prev, description: e.target.value } : null)}
                            multiline
                            rows={2}
                            fullWidth
                        />
                        <FormControl fullWidth>
                            <InputLabel>{t('games.werewolf.editor.alignment', 'Alignment')}</InputLabel>
                            <Select
                                value={editingRole?.alignment || 'VILLAGER'}
                                label={t('games.werewolf.editor.alignment', 'Alignment')}
                                onChange={e => setEditingRole(prev => prev ? { ...prev, alignment: e.target.value as RoleAlignment } : null)}
                            >
                                <MenuItem value="VILLAGER">Villager</MenuItem>
                                <MenuItem value="WEREWOLF">Werewolf</MenuItem>
                                <MenuItem value="NEUTRAL">Neutral</MenuItem>
                            </Select>
                        </FormControl>

                        <Divider sx={{ my: 1 }} />

                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle1">{t('games.werewolf.editor.abilities', 'Abilities')}</Typography>
                            <Button size="small" startIcon={<AddIcon />} onClick={handleAddAbility}>
                                {t('games.werewolf.editor.add_ability', 'Add Ability')}
                            </Button>
                        </Box>

                        {editingRole?.abilities.map((ability, idx) => (
                            <Paper key={idx} sx={{ p: 2, bgcolor: 'background.default' }}>
                                <Box display="flex" flexDirection="column" gap={2}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography variant="caption">#{idx + 1}</Typography>
                                        <IconButton size="small" onClick={() => handleRemoveAbility(idx)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>{t('games.werewolf.editor.ability_type', 'Action')}</InputLabel>
                                        <Select
                                            value={ability.type}
                                            label={t('games.werewolf.editor.ability_type', 'Action')}
                                            onChange={e => handleUpdateAbility(idx, { type: e.target.value as any })}
                                        >
                                            <MenuItem value="KILL">Kill</MenuItem>
                                            <MenuItem value="HEAL">Heal</MenuItem>
                                            <MenuItem value="PROTECT">Protect</MenuItem>
                                            <MenuItem value="INFECT">Infect</MenuItem>
                                            <MenuItem value="CHECK_ROLE">Check Role</MenuItem>
                                            <MenuItem value="LINK_LOVERS">Link Lovers</MenuItem>
                                            <MenuItem value="GIVE_EGG">Give Item</MenuItem>
                                            <MenuItem value="CHOOSE_CAMP">Choose Camp</MenuItem>
                                            <MenuItem value="STEAL_ROLE">Steal Role</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <Box display="flex" gap={2}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>{t('games.werewolf.editor.timing', 'Timing')}</InputLabel>
                                            <Select
                                                value={ability.timing}
                                                label={t('games.werewolf.editor.timing', 'Timing')}
                                                onChange={e => handleUpdateAbility(idx, { timing: e.target.value as any })}
                                            >
                                                <MenuItem value="EVERY_NIGHT">Every Night</MenuItem>
                                                <MenuItem value="FIRST_NIGHT">First Night Only</MenuItem>
                                                <MenuItem value="ROUND_NUMBER">Specific Round</MenuItem>
                                            </Select>
                                        </FormControl>
                                        <TextField
                                            label={t('games.werewolf.editor.targets', 'Targets')}
                                            type="number"
                                            size="small"
                                            value={ability.targetCount}
                                            onChange={e => handleUpdateAbility(idx, { targetCount: parseInt(e.target.value) })}
                                            sx={{ width: 100 }}
                                        />
                                    </Box>
                                </Box>
                            </Paper>
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsDialogOpen(false)}>{t('common.back')}</Button>
                    <Button onClick={handleSaveRole} variant="contained" color="primary">{t('common.save')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
