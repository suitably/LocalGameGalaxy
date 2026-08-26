import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    TextField,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import type { RoleDefinition, Ability, RoleAlignment, NightAction } from '../logic/types';

interface RoleEditDialogProps {
    open: boolean;
    editingRole: RoleDefinition | null;
    defaultRoles: RoleDefinition[];
    roles: RoleDefinition[];
    onClose: () => void;
    onSave: (role: RoleDefinition) => void;
}

const EMPTY_ABILITY: Ability = {
    type: 'KILL',
    timing: 'EVERY_NIGHT',
    targetCount: 1,
};

export const RoleEditDialog: React.FC<RoleEditDialogProps> = ({
    open,
    editingRole: initialRole,
    roles,
    onClose,
    onSave
}) => {
    const { t } = useTranslation();
    const [currentRole, setCurrentRole] = useState<RoleDefinition | null>(initialRole);

    useEffect(() => {
        setCurrentRole(initialRole);
    }, [initialRole]);

    if (!currentRole) return null;

    const handleAddAbility = () => {
        setCurrentRole(prev => prev ? {
            ...prev,
            abilities: [...prev.abilities, { ...EMPTY_ABILITY }]
        } : null);
    };

    const handleRemoveAbility = (index: number) => {
        setCurrentRole(prev => prev ? {
            ...prev,
            abilities: prev.abilities.filter((_, idx) => idx !== index)
        } : null);
    };

    const handleUpdateAbility = (index: number, updates: Partial<Ability>) => {
        setCurrentRole(prev => {
            if (!prev) return null;
            const updated = [...prev.abilities];
            updated[index] = { ...updated[index], ...updates };
            return { ...prev, abilities: updated };
        });
    };

    const handleSave = () => {
        if (currentRole) {
            onSave(currentRole);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {currentRole.name
                    ? t('games.werewolf.ui.editor.edit_role', 'Edit Role')
                    : t('games.werewolf.ui.editor.new_role', 'New Role')}
            </DialogTitle>
            <DialogContent>
                <Box display="flex" flexDirection="column" gap={2} mt={1}>
                    <TextField
                        label={t('games.werewolf.ui.editor.role_name', 'Role Name')}
                        value={currentRole.name || ''}
                        onChange={e => setCurrentRole(prev => prev ? { ...prev, name: e.target.value } : null)}
                        fullWidth
                    />
                    <FormControl fullWidth>
                        <InputLabel>{t('games.werewolf.ui.editor.inherits_from', 'Inherits From')}</InputLabel>
                        <Select
                            value={currentRole.inheritsFrom || ''}
                            label={t('games.werewolf.ui.editor.inherits_from', 'Inherits From')}
                            onChange={e => setCurrentRole(prev => prev ? { ...prev, inheritsFrom: e.target.value || undefined } : null)}
                        >
                            <MenuItem value="">
                                <em>{t('games.werewolf.ui.editor.inherits_from_none', 'None')}</em>
                            </MenuItem>
                            {roles
                                .filter(r => r.id !== currentRole.id)
                                .map(r => (
                                    <MenuItem key={r.id} value={r.id}>
                                        {r.icon} {r.name || t(`games.werewolf.roles.${r.id}`)}
                                    </MenuItem>
                                ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label={t('games.werewolf.ui.editor.description', 'Description')}
                        value={currentRole.description || ''}
                        onChange={e => setCurrentRole(prev => prev ? { ...prev, description: e.target.value } : null)}
                        multiline
                        rows={2}
                        fullWidth
                    />
                    <TextField
                        label={t('games.werewolf.ui.editor.narrator_text', 'Night Narration')}
                        value={currentRole.narratorText || ''}
                        onChange={e => setCurrentRole(prev => prev ? { ...prev, narratorText: e.target.value } : null)}
                        multiline
                        rows={2}
                        fullWidth
                        helperText={t('games.werewolf.ui.editor.narrator_text_hint', 'Text read by narrator at night. Leave empty to use default.')}
                    />
                    <FormControl fullWidth>
                        <InputLabel>{t('games.werewolf.ui.editor.alignment', 'Alignment')}</InputLabel>
                        <Select
                            value={currentRole.alignment || 'VILLAGER'}
                            label={t('games.werewolf.ui.editor.alignment', 'Alignment')}
                            onChange={e => setCurrentRole(prev => prev ? { ...prev, alignment: e.target.value as RoleAlignment } : null)}
                        >
                            <MenuItem value="VILLAGER">{t('games.werewolf.ui.editor.alignments.villager', 'Villager')}</MenuItem>
                            <MenuItem value="WEREWOLF">{t('games.werewolf.ui.editor.alignments.werewolf', 'Werewolf')}</MenuItem>
                            <MenuItem value="NEUTRAL">{t('games.werewolf.ui.editor.alignments.neutral', 'Neutral')}</MenuItem>
                        </Select>
                    </FormControl>

                    <Divider sx={{ my: 1 }} />

                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle1">{t('games.werewolf.ui.editor.abilities', 'Abilities')}</Typography>
                        <Button size="small" startIcon={<AddIcon />} onClick={handleAddAbility}>
                            {t('games.werewolf.ui.editor.add_ability', 'Add Ability')}
                        </Button>
                    </Box>

                    {currentRole.abilities.map((ability, idx) => (
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
                                        onChange={e => handleUpdateAbility(idx, { type: e.target.value as NightAction['type'] })}
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
                                            onChange={e => handleUpdateAbility(idx, { timing: e.target.value as Ability['timing'] })}
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
                                        onChange={e => handleUpdateAbility(idx, { targetCount: parseInt(e.target.value) || 1 })}
                                        sx={{ width: 100 }}
                                    />
                                </Box>
                            </Box>
                        </Paper>
                    ))}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('common.back')}</Button>
                <Button onClick={handleSave} variant="contained" color="primary">{t('common.save')}</Button>
            </DialogActions>
        </Dialog>
    );
};
