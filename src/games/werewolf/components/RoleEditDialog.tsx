import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/AddRounded';
import { useTranslation } from 'react-i18next';
import type { RoleDefinition, Ability, RoleAlignment } from '../logic/types';
import { AbilityEditor } from './editor/AbilityEditor';
import { RoleIcon } from './RoleIcon';

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
  onSave,
}) => {
  const { t } = useTranslation();
  const [currentRole, setCurrentRole] = useState<RoleDefinition | null>(initialRole);

  useEffect(() => {
    setCurrentRole(initialRole);
  }, [initialRole]);

  if (!currentRole) return null;

  const handleAddAbility = () => {
    setCurrentRole((prev) =>
      prev
        ? {
            ...prev,
            abilities: [...prev.abilities, { ...EMPTY_ABILITY }],
          }
        : null,
    );
  };

  const handleRemoveAbility = (index: number) => {
    setCurrentRole((prev) =>
      prev
        ? {
            ...prev,
            abilities: prev.abilities.filter((_, idx) => idx !== index),
          }
        : null,
    );
  };

  const handleUpdateAbility = (index: number, updates: Partial<Ability>) => {
    setCurrentRole((prev) => {
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
            onChange={(e) =>
              setCurrentRole((prev) => (prev ? { ...prev, name: e.target.value } : null))
            }
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>{t('games.werewolf.ui.editor.inherits_from', 'Inherits From')}</InputLabel>
            <Select
              value={currentRole.inheritsFrom || ''}
              label={t('games.werewolf.ui.editor.inherits_from', 'Inherits From')}
              onChange={(e) =>
                setCurrentRole((prev) =>
                  prev ? { ...prev, inheritsFrom: e.target.value || undefined } : null,
                )
              }
            >
              <MenuItem value="">
                <em>{t('games.werewolf.ui.editor.inherits_from_none', 'None')}</em>
              </MenuItem>
              {roles
                .filter((r) => r.id !== currentRole.id)
                .map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    <RoleIcon icon={r.icon} fontSize="1.1rem" />{' '}
                    {r.name || t(`games.werewolf.roles.${r.id}`)}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <TextField
            label={t('games.werewolf.ui.editor.description', 'Description')}
            value={currentRole.description || ''}
            onChange={(e) =>
              setCurrentRole((prev) => (prev ? { ...prev, description: e.target.value } : null))
            }
            multiline
            rows={2}
            fullWidth
          />
          <TextField
            label={t('games.werewolf.ui.editor.narrator_text', 'Night Narration')}
            value={currentRole.narratorText || ''}
            onChange={(e) =>
              setCurrentRole((prev) => (prev ? { ...prev, narratorText: e.target.value } : null))
            }
            multiline
            rows={2}
            fullWidth
            helperText={t(
              'games.werewolf.ui.editor.narrator_text_hint',
              'Text read by narrator at night. Leave empty to use default.',
            )}
          />
          <FormControl fullWidth>
            <InputLabel>{t('games.werewolf.ui.editor.alignment', 'Alignment')}</InputLabel>
            <Select
              value={currentRole.alignment || 'VILLAGER'}
              label={t('games.werewolf.ui.editor.alignment', 'Alignment')}
              onChange={(e) =>
                setCurrentRole((prev) =>
                  prev ? { ...prev, alignment: e.target.value as RoleAlignment } : null,
                )
              }
            >
              <MenuItem value="VILLAGER">
                {t('games.werewolf.ui.editor.alignments.villager', 'Villager')}
              </MenuItem>
              <MenuItem value="WEREWOLF">
                {t('games.werewolf.ui.editor.alignments.werewolf', 'Werewolf')}
              </MenuItem>
              <MenuItem value="NEUTRAL">
                {t('games.werewolf.ui.editor.alignments.neutral', 'Neutral')}
              </MenuItem>
            </Select>
          </FormControl>

          <Divider sx={{ my: 1 }} />

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1">
              {t('games.werewolf.ui.editor.abilities', 'Abilities')}
            </Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={handleAddAbility}>
              {t('games.werewolf.ui.editor.add_ability', 'Add Ability')}
            </Button>
          </Box>

          {currentRole.abilities.map((ability, idx) => (
            <AbilityEditor
              key={idx}
              ability={ability}
              index={idx}
              onChange={(updates) => handleUpdateAbility(idx, updates)}
              onRemove={() => handleRemoveAbility(idx)}
            />
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.back')}</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
