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
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteRounded';
import EditIcon from '@mui/icons-material/EditRounded';
import AddIcon from '@mui/icons-material/AddRounded';
import SaveIcon from '@mui/icons-material/SaveRounded';
import CloseIcon from '@mui/icons-material/CloseRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreRounded';
import RestartAltIcon from '@mui/icons-material/RestartAltRounded';
import { useTranslation } from 'react-i18next';
import { generateUUID } from '../../../lib/uuid';
import type { RoleDefinition } from '../logic/types';
import { RoleEditDialog } from './RoleEditDialog';
import { RoleIcon } from './RoleIcon';

interface RoleEditorProps {
  customRoles: RoleDefinition[];
  defaultRoles?: RoleDefinition[];
  onSaveRoles: (roles: RoleDefinition[]) => void;
  onClose: () => void;
}

export const RoleEditor: React.FC<RoleEditorProps> = ({
  customRoles,
  defaultRoles = [],
  onSaveRoles,
  onClose,
}) => {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<RoleDefinition[]>(() => {
    const merged = [...defaultRoles];
    customRoles.forEach((custom) => {
      const index = merged.findIndex((r) => r.id === custom.id);
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
      icon: 'CUSTOM',
      alignment: 'VILLAGER',
      abilities: [],
      isCustom: true,
    });
    setIsDialogOpen(true);
  };

  const handleEditRole = (role: RoleDefinition) => {
    setEditingRole({ ...role });
    setIsDialogOpen(true);
  };

  const handleDeleteRole = (id: string, isDefault: boolean) => {
    if (isDefault) {
      const originalDefault = defaultRoles.find((r) => r.id === id);
      if (originalDefault) {
        setRoles((prev) => prev.map((r) => (r.id === id ? originalDefault : r)));
      }
    } else {
      setRoles((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleSaveRole = (updatedRole: RoleDefinition) => {
    setRoles((prev) => {
      const index = prev.findIndex((r) => r.id === updatedRole.id);
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
    const rolesToSave = roles.filter((role) => {
      const defaultDef = defaultRoles.find((d) => d.id === role.id);
      if (!defaultDef) return true;
      return JSON.stringify(role) !== JSON.stringify(defaultDef);
    });

    onSaveRoles(rolesToSave);
  };

  const customRolesList = roles.filter((r) => r.isCustom);
  const standardRolesList = roles.filter((r) => !r.isCustom);

  const renderRoleItem = (role: RoleDefinition) => {
    const isDefaultId = defaultRoles.some((d) => d.id === role.id);
    const defaultDef = defaultRoles.find((d) => d.id === role.id);
    const isModified =
      isDefaultId && defaultDef && JSON.stringify(role) !== JSON.stringify(defaultDef);

    const displayName = isDefaultId ? t(`games.werewolf.roles.${role.id}`, role.name) : role.name;
    const displayDescription = isDefaultId
      ? t(`games.werewolf.role_descriptions.${role.id}`, role.description)
      : role.description;
    const editLabel = `${t('games.werewolf.ui.editor.edit_role')}: ${displayName}`;
    const removeAction = isDefaultId ? t('common.reset') : t('common.delete');
    const removeLabel = `${removeAction}: ${displayName}`;

    return (
      <ListItem key={role.id} divider sx={{ alignItems: 'flex-start', gap: 1 }}>
        <ListItemText
          sx={{ flex: '1 1 auto', minWidth: 0 }}
          primary={
            <Box display="flex" alignItems="center" gap={1}>
              <Typography>
                <RoleIcon icon={role.icon} /> {displayName}
              </Typography>
              {isModified && (
                <Chip
                  label={t('common.modified')}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
          }
          secondary={displayDescription}
        />
        <Box display="flex" flexShrink={0} alignItems="center" gap={0.5}>
          <Tooltip title={editLabel}>
            <IconButton edge="end" onClick={() => handleEditRole(role)} aria-label={editLabel}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={removeLabel}>
            <IconButton
              edge="end"
              onClick={() => handleDeleteRole(role.id, isDefaultId)}
              color={isDefaultId ? 'default' : 'error'}
              aria-label={removeLabel}
            >
              {isDefaultId ? <RestartAltIcon /> : <DeleteIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </ListItem>
    );
  };

  return (
    <Box p={2}>
      {/* Dialog title bar: close X (discards changes), title, add role */}
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <IconButton edge="start" onClick={onClose} aria-label={t('common.close')}>
          <CloseIcon />
        </IconButton>
        <Typography variant="h5" component="h2" sx={{ flexGrow: 1 }}>
          {t('games.werewolf.ui.editor.title')}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddRole}>
          {t('games.werewolf.ui.editor.add_role')}
        </Button>
      </Box>

      <Box display="flex" flexDirection="column" gap={2}>
        {customRolesList.length > 0 && (
          <Paper variant="outlined" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ p: 2, pb: 0 }}>
              {t('games.werewolf.ui.editor.custom_roles')}
            </Typography>
            <List sx={{ width: '100%' }}>{customRolesList.map(renderRoleItem)}</List>
          </Paper>
        )}

        <Accordion defaultExpanded={false} variant="outlined" disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">
              {t('games.werewolf.ui.editor.standard_roles')} ({standardRolesList.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <List sx={{ width: '100%' }}>{standardRolesList.map(renderRoleItem)}</List>
          </AccordionDetails>
        </Accordion>
      </Box>

      <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSaveAll}
        >
          {t('common.save_all')}
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
