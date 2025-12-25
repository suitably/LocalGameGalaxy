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
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { RoleDefinition, Ability, RoleAlignment } from '../logic/types';

interface RoleEditorProps {
    customRoles: RoleDefinition[];
    defaultRoles?: RoleDefinition[];
    onSaveRoles: (roles: RoleDefinition[]) => void;
    onClose: () => void;
}

const EMPTY_ABILITY: Ability = {
    type: 'KILL',
    timing: 'EVERY_NIGHT',
    targetCount: 1,
};

export const RoleEditor: React.FC<RoleEditorProps> = ({ customRoles, defaultRoles = [], onSaveRoles, onClose }) => {
    const { t } = useTranslation();
    // mergedRoles contains all unique roles. If a custom role shares an ID with a default role, it overrides it.
    const [roles, setRoles] = useState<RoleDefinition[]>(() => {
        // Clone defaults to avoid mutations
        const merged = [...defaultRoles];
        customRoles.forEach(custom => {
            const index = merged.findIndex(r => r.id === custom.id);
            if (index > -1) {
                // Override default role
                merged[index] = { ...custom, isCustom: false }; // Ensure it keeps isCustom=false if it's an override
            } else {
                // New custom role
                merged.push({ ...custom, isCustom: true });
            }
        });
        return merged;
    });

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

    const handleDeleteRole = (id: string, isDefault: boolean) => {
        if (isDefault) {
            // Reset to default: remove the override from our working state
            // We start by getting the original default
            const originalDefault = defaultRoles.find(r => r.id === id);
            if (originalDefault) {
                setRoles(prev => prev.map(r => r.id === id ? originalDefault : r));
            }
        } else {
            // Truly delete custom role
            setRoles(prev => prev.filter(r => r.id !== id));
        }
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

    const handleSaveAll = () => {
        // We only want to bubble up the "custom" roles (which now includes overrides of defaults)
        // An override is any role in 'roles' that:
        // 1. Is not in defaultRoles OR
        // 2. Is in defaultRoles but acts different (we can just save all that have matching IDs but different content, or just save everything that isn't === ref, but simpler:
        // Actually, the simplest approach for the parent app is to just receive a list of "Custom Definitions".
        // The parent will persist these. When reloading, the parent merges Default + Custom again.
        // So we need to filter out roles that are IDENTICAL to their default counterparts.

        const rolesToSave = roles.filter(role => {
            const defaultDef = defaultRoles.find(d => d.id === role.id);
            if (!defaultDef) return true; // It's a purely custom role

            // It is a default role ID, check if it's modified
            // This is a deep comparison approximation. 
            return JSON.stringify(role) !== JSON.stringify(defaultDef);
        });

        onSaveRoles(rolesToSave);
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

            {/* SEPARATE LISTS: Custom (Always Visible) vs Standard (Collapsed) */}
            {(() => {
                //    - Custom: isCustom === true (New roles)
                //    - Standard: isCustom !== true (Default or Overrides)

                const customRolesList = roles.filter(r => r.isCustom);
                const standardRolesList = roles.filter(r => !r.isCustom);

                const renderRoleItem = (role: RoleDefinition) => {
                    const isDefaultId = defaultRoles.some(d => d.id === role.id);
                    // Check if modified
                    const defaultDef = defaultRoles.find(d => d.id === role.id);
                    const isModified = isDefaultId && defaultDef && JSON.stringify(role) !== JSON.stringify(defaultDef);

                    return (
                        <ListItem key={role.id} divider>
                            <ListItemText
                                primary={
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Typography>{role.icon} {role.name}</Typography>
                                        {isModified && <Chip label={t('common.modified', 'Modified')} size="small" color="primary" variant="outlined" />}
                                    </Box>
                                }
                                secondary={role.description}
                            />
                            <ListItemSecondaryAction>
                                <IconButton edge="end" onClick={() => handleEditRole(role)} sx={{ mr: 1 }}>
                                    <EditIcon />
                                </IconButton>
                                <IconButton
                                    edge="end"
                                    onClick={() => handleDeleteRole(role.id, isDefaultId)}
                                    color={isDefaultId ? "default" : "error"}
                                    title={isDefaultId ? t('common.reset', 'Reset') : t('common.delete', 'Delete')}
                                >
                                    {isDefaultId ? <CloseIcon /> : <DeleteIcon />}
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    );
                };

                return (
                    <Box display="flex" flexDirection="column" gap={2}>
                        {customRolesList.length > 0 && (
                            <Paper sx={{ mb: 2 }}>
                                <Typography variant="h6" sx={{ p: 2, pb: 0 }}>
                                    {t('games.werewolf.editor.custom_roles', 'Custom Roles')}
                                </Typography>
                                <List sx={{ width: '100%' }}>
                                    {customRolesList.map(renderRoleItem)}
                                </List>
                            </Paper>
                        )}

                        <Accordion defaultExpanded={false}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="h6">
                                    {t('games.werewolf.editor.standard_roles', 'Standard Roles')} ({standardRolesList.length})
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 0 }}>
                                <List sx={{ width: '100%' }}>
                                    {standardRolesList.map(renderRoleItem)}
                                </List>
                            </AccordionDetails>
                        </Accordion>
                    </Box>
                );
            })()}

            <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
                <Button onClick={onClose}>{t('common.back')}</Button>
                <Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={handleSaveAll}>
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
                        <TextField
                            label={t('games.werewolf.editor.narrator_text', 'Night Narration')}
                            value={editingRole?.narratorText || ''}
                            onChange={e => setEditingRole(prev => prev ? { ...prev, narratorText: e.target.value } : null)}
                            multiline
                            rows={2}
                            fullWidth
                            helperText={t('games.werewolf.editor.narrator_text_hint', 'Text read by narrator at night. Leave empty to use default.')}
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
