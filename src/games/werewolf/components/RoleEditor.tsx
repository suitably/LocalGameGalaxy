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

/**
 * Props for configuring the RoleEditor component.
 */
interface RoleEditorProps {
    /** The list of currently saved custom/modified role definitions. */
    customRoles: RoleDefinition[];
    /** The base built-in roles that can be overridden or cloned. */
    defaultRoles?: RoleDefinition[];
    /** Callback triggered when the updated list of custom/overridden roles is saved. */
    onSaveRoles: (roles: RoleDefinition[]) => void;
    /** Close handler to discard changes or return to setup screen. */
    onClose: () => void;
}

const EMPTY_ABILITY: Ability = {
    type: 'KILL',
    timing: 'EVERY_NIGHT',
    targetCount: 1,
};

/**
 * `RoleEditor` — Werewolf Custom Role Creator & Override UI
 * 
 * Provides an interactive UI to customize Werewolf role properties and abilities.
 * 
 * ## Custom Role Overriding Rules
 * - **Overrides**: If a custom role's `id` matches a built-in role ID, the custom definition
 *   overrides the default built-in role behaviors, while preserving `isCustom: false` to represent
 *   it is an override of a default role.
 * - **Customs**: If the ID is new (generated as a random UUID), it is treated as a fully custom role
 *   with `isCustom: true` and alignment.
 * 
 * ## Ability Specifications Schema
 * New abilities can be added to custom roles using the {@link Ability} schema:
 * - `type`: Action type (e.g. `KILL`, `HEAL`, `PROTECT`, `INFECT`, `CHECK_ROLE`, `LINK_LOVERS`, `OIL`, `BURN`, `GIVE_EGG`, `CHOOSE_CAMP`, `STEAL_ROLE`).
 * - `timing`: Action occurrence (`EVERY_NIGHT`, `FIRST_NIGHT`, `ROUND_NUMBER`).
 * - `targetCount`: Number of target players needed.
 * - `usesPerGame` / `usesPerNight`: Optional limits.
 */
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
                <Typography variant="h5">{t('games.werewolf.ui.editor.title', 'Role Editor')}</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddRole}>
                    {t('games.werewolf.ui.editor.add_role', 'Add Role')}
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

                    const displayName = isDefaultId ? t(`games.werewolf.roles.${role.id}`, role.name) : role.name;
                    const displayDescription = isDefaultId ? t(`games.werewolf.role_descriptions.${role.id}`, role.description) : role.description;

                    return (
                        <ListItem key={role.id} divider>
                            <ListItemText
                                primary={
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Typography>{role.icon} {displayName}</Typography>
                                        {isModified && <Chip label={t('common.modified', 'Modified')} size="small" color="primary" variant="outlined" />}
                                    </Box>
                                }
                                secondary={displayDescription}
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
                                    {t('games.werewolf.ui.editor.custom_roles', 'Custom Roles')}
                                </Typography>
                                <List sx={{ width: '100%' }}>
                                    {customRolesList.map(renderRoleItem)}
                                </List>
                            </Paper>
                        )}

                        <Accordion defaultExpanded={false}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="h6">
                                    {t('games.werewolf.ui.editor.standard_roles', 'Standard Roles')} ({standardRolesList.length})
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
                    {t('common.save_all', 'Save All')}
                </Button>
            </Box>

            <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingRole?.name ? t('games.werewolf.ui.editor.edit_role', 'Edit Role') : t('games.werewolf.ui.editor.new_role', 'New Role')}</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            label={t('games.werewolf.ui.editor.role_name', 'Role Name')}
                            value={editingRole?.name || ''}
                            onChange={e => setEditingRole(prev => prev ? { ...prev, name: e.target.value } : null)}
                            fullWidth
                        />
                        <FormControl fullWidth>
                            <InputLabel>{t('games.werewolf.ui.editor.inherits_from', 'Inherits From')}</InputLabel>
                            <Select
                                value={editingRole?.inheritsFrom || ''}
                                label={t('games.werewolf.ui.editor.inherits_from', 'Inherits From')}
                                onChange={e => setEditingRole(prev => prev ? { ...prev, inheritsFrom: e.target.value } : null)}
                            >
                                <MenuItem value=""><em>{t('games.werewolf.ui.editor.inherits_from_none', 'None')}</em></MenuItem>
                                {defaultRoles.map(role => (
                                    <MenuItem key={role.id} value={role.id}>{t(`games.werewolf.roles.${role.id}`, role.name)}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label={t('games.werewolf.ui.editor.description', 'Description')}
                            value={editingRole?.description || ''}
                            onChange={e => setEditingRole(prev => prev ? { ...prev, description: e.target.value } : null)}
                            multiline
                            rows={2}
                            fullWidth
                        />
                        <TextField
                            label={t('games.werewolf.ui.editor.narrator_text', 'Night Narration')}
                            value={editingRole?.narratorText || ''}
                            onChange={e => setEditingRole(prev => prev ? { ...prev, narratorText: e.target.value } : null)}
                            multiline
                            rows={2}
                            fullWidth
                            helperText={t('games.werewolf.ui.editor.narrator_text_hint', 'Text read by narrator at night. Leave empty to use default.')}
                        />
                        <FormControl fullWidth>
                            <InputLabel>{t('games.werewolf.ui.editor.alignment', 'Alignment')}</InputLabel>
                            <Select
                                value={editingRole?.alignment || 'VILLAGER'}
                                label={t('games.werewolf.ui.editor.alignment', 'Alignment')}
                                onChange={e => setEditingRole(prev => prev ? { ...prev, alignment: e.target.value as RoleAlignment } : null)}
                            >
                                <MenuItem value="VILLAGER">{t('games.werewolf.ui.editor.alignments.villager', 'Villager')}</MenuItem>
                                <MenuItem value="WEREWOLF">{t('games.werewolf.ui.editor.alignments.werewolf', 'Werewolf')}</MenuItem>
                                <MenuItem value="NEUTRAL">{t('games.werewolf.ui.editor.alignments.neutral', 'Neutral')}</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel>{t('games.werewolf.editor.inherits_from', 'Inherits From')}</InputLabel>
                            <Select
                                value={editingRole?.inheritsFrom || ''}
                                label={t('games.werewolf.editor.inherits_from', 'Inherits From')}
                                onChange={e => setEditingRole(prev => prev ? { ...prev, inheritsFrom: e.target.value || undefined } : null)}
                            >
                                <MenuItem value="">
                                    <em>{t('games.werewolf.editor.inherits_from_none', 'None')}</em>
                                </MenuItem>
                                {roles
                                    .filter(r => r.id !== editingRole?.id)
                                    .map(r => (
                                        <MenuItem key={r.id} value={r.id}>
                                            {r.icon} {r.name || t(`games.werewolf.roles.${r.id}`)}
                                        </MenuItem>
                                    ))}
                            </Select>
                        </FormControl>

                        <Divider sx={{ my: 1 }} />

                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle1">{t('games.werewolf.ui.editor.abilities', 'Abilities')}</Typography>
                            <Button size="small" startIcon={<AddIcon />} onClick={handleAddAbility}>
                                {t('games.werewolf.ui.editor.add_ability', 'Add Ability')}
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
                                        <InputLabel>{t('games.werewolf.ui.editor.ability_type', 'Action')}</InputLabel>
                                        <Select
                                            value={ability.type}
                                            label={t('games.werewolf.ui.editor.ability_type', 'Action')}
                                            onChange={e => handleUpdateAbility(idx, { type: e.target.value as any })}
                                        >
                                            <MenuItem value="KILL">{t('games.werewolf.ui.editor.ability_types.kill', 'Kill')}</MenuItem>
                                            <MenuItem value="HEAL">{t('games.werewolf.ui.editor.ability_types.heal', 'Heal')}</MenuItem>
                                            <MenuItem value="PROTECT">{t('games.werewolf.ui.editor.ability_types.protect', 'Protect')}</MenuItem>
                                            <MenuItem value="INFECT">{t('games.werewolf.ui.editor.ability_types.infect', 'Infect')}</MenuItem>
                                            <MenuItem value="CHECK_ROLE">{t('games.werewolf.ui.editor.ability_types.check_role', 'Check Role')}</MenuItem>
                                            <MenuItem value="LINK_LOVERS">{t('games.werewolf.ui.editor.ability_types.link_lovers', 'Link Lovers')}</MenuItem>
                                            <MenuItem value="GIVE_EGG">{t('games.werewolf.ui.editor.ability_types.give_egg', 'Give Item')}</MenuItem>
                                            <MenuItem value="CHOOSE_CAMP">{t('games.werewolf.ui.editor.ability_types.choose_camp', 'Choose Camp')}</MenuItem>
                                            <MenuItem value="STEAL_ROLE">{t('games.werewolf.ui.editor.ability_types.steal_role', 'Steal Role')}</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <Box display="flex" gap={2}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>{t('games.werewolf.ui.editor.timing', 'Timing')}</InputLabel>
                                            <Select
                                                value={ability.timing}
                                                label={t('games.werewolf.ui.editor.timing', 'Timing')}
                                                onChange={e => handleUpdateAbility(idx, { timing: e.target.value as any })}
                                            >
                                                <MenuItem value="EVERY_NIGHT">{t('games.werewolf.ui.editor.timing_options.every_night', 'Every Night')}</MenuItem>
                                                <MenuItem value="FIRST_NIGHT">{t('games.werewolf.ui.editor.timing_options.first_night', 'First Night Only')}</MenuItem>
                                                <MenuItem value="ROUND_NUMBER">{t('games.werewolf.ui.editor.timing_options.round_number', 'Specific Round')}</MenuItem>
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
