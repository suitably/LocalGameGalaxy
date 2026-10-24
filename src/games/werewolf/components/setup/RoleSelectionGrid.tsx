import React from 'react';
import { Box, Checkbox, FormControlLabel, Grid, IconButton, Typography } from '@mui/material';
import InfoIcon from '@mui/icons-material/InfoRounded';
import { useTranslation } from 'react-i18next';
import type { Role, RoleDefinition } from '../../logic/types';
import { DEFAULT_ROLES } from '../../logic/defaultRoles';
import { RoleIcon } from '../RoleIcon';

// Derived from DEFAULT_ROLES to avoid duplication, but exclude base WEREWOLF
const SPECIAL_ROLES = DEFAULT_ROLES.filter((r) => r.id !== 'WEREWOLF').map((r) => r.id as Role);

interface RoleEntry {
  def: RoleDefinition;
  name: string;
}

interface RoleSelectionGridProps {
  customRoles: RoleDefinition[];
  enabledRoles: Role[];
  onToggle: (role: Role) => void;
  onShowInfo: (role: RoleDefinition) => void;
}

export const RoleSelectionGrid: React.FC<RoleSelectionGridProps> = ({
  customRoles,
  enabledRoles,
  onToggle,
  onShowInfo,
}) => {
  const { t } = useTranslation();

  // Built-in roles first (a custom override wins), then pure custom roles.
  const builtIn: RoleEntry[] = [];
  for (const id of SPECIAL_ROLES) {
    const customDef = customRoles.find((r) => r.id === id);
    const def = customDef || DEFAULT_ROLES.find((r) => r.id === id);
    if (def) builtIn.push({ def, name: customDef?.name || t(`games.werewolf.roles.${id}`) });
  }
  const entries: RoleEntry[] = [...builtIn, ...customRoles.map((def) => ({ def, name: def.name }))];

  return (
    <Grid container spacing={1}>
      {entries.map(({ def, name }, index) => (
        <Grid size={{ xs: 6 }} key={`${def.id}-${index}`}>
          <FormControlLabel
            control={
              <Checkbox
                checked={enabledRoles.includes(def.id)}
                onChange={() => onToggle(def.id)}
                size="small"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <RoleIcon icon={def.icon} fontSize="1.1rem" />
                <Typography variant="body2">{name}</Typography>
                <IconButton
                  size="small"
                  aria-label={t('games.werewolf.ui.role_info', 'Role info')}
                  onClick={(e) => {
                    e.preventDefault();
                    onShowInfo(def);
                  }}
                  sx={{ p: 0.5, color: 'text.secondary', opacity: 0.5 }}
                >
                  <InfoIcon fontSize="inherit" />
                </IconButton>
              </Box>
            }
          />
        </Grid>
      ))}
    </Grid>
  );
};
