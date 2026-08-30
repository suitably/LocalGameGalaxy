import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import { generateUUID } from '../../../lib/uuid';
import type { RoleDefinition } from '../logic/types';
import { RoleEditDialog } from './RoleEditDialog';

interface RoleEditorProps {
    customRoles: RoleDefinition[];
    defaultRoles?: RoleDefinition[];
    onSaveRoles: (roles: RoleDefinition[]) => void;
    onClose: () => void;
}

export const RoleEditor: React.FC<RoleEditorProps> = ({ customRoles, defaultRoles = [], onSaveRoles, onClose }) => {
    const { t } = useTranslation();
    const [roles, setRoles] = useState<RoleDefinition[]>(() => {
        const merged = [...defaultRoles];
        customRoles.forEach(custom => {
            const index = merged.findIndex(r => r.id === custom.id);
            if (index > -1) {
                merged[index] = { ...custom, isCustom: false };
            } else {
                merged.push({ ...custom, isCustom: true });
            }
        });
        return merged;
    });

    const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleAddRole = () => {
        setEditingRole({
            id: generateUUID(),
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
            const originalDefault = defaultRoles.find(r => r.id === id);
            if (originalDefault) {
                setRoles(prev => prev.map(r => r.id === id ? originalDefault : r));
            }
        } else {
            setRoles(prev => prev.filter(r => r.id !== id));
        }
    };

    const handleSaveRole = (updatedRole: RoleDefinition) => {
        setRoles(prev => {
            const index = prev.findIndex(r => r.id === updatedRole.id);
            if (index > -1) {
                const newRoles = [...prev];
                newRoles[index] = updatedRole;
                return newRoles;
            }
            return [...prev, updatedRole];
        });
        setIsDialogOpen(false);
        setEditingRole(null);
    };

    const handleSaveAll = () => {
        const rolesToSave = roles.filter(role => {
            const defaultDef = defaultRoles.find(d => d.id === role.id);
            if (!defaultDef) return true;
            return JSON.stringify(role) !== JSON.stringify(defaultDef);
        });

        onSaveRoles(rolesToSave);
    };

    const customRolesList = roles.filter(r => r.isCustom);
    const standardRolesList = roles.filter(r => !r.isCustom);

    const renderRoleItem = (role: RoleDefinition) => {
        const isDefaultId = defaultRoles.some(d => d.id === role.id);
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
        <Box p={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5">{t('games.werewolf.ui.editor.title', 'Role Editor')}</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddRole}>
                    {t('games.werewolf.ui.editor.add_role', 'Add Role')}
                </Button>
            </Box>

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

            <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
                <Button onClick={onClose}>{t('common.back')}</Button>
                <Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={handleSaveAll}>
                    {t('common.save_all', 'Save All')}
                </Button>
            </Box>

            <RoleEditDialog
                open={isDialogOpen}
                editingRole={editingRole}
                defaultRoles={defaultRoles}
                roles={roles}
                onClose={() => setIsDialogOpen(false)}
                onSave={handleSaveRole}
            />
        </Box>
    );
};
