/**
 * One switch per API key permission, shared by the create and edit dialogs [ID: COMP-ADMIN-PERMISSION-SWITCHES]
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, FormControlLabel, Switch } from '@mui/material';
import type { ApiKeyPermissions } from '../hooks/useServerApiKeys';
import { PERMISSION_FLAGS } from './permissionFlags';

interface Props {
  value: ApiKeyPermissions;
  onChange: (value: ApiKeyPermissions) => void;
}

export const PermissionSwitches: React.FC<Props> = ({ value, onChange }) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1, mb: 2 }}>
      {PERMISSION_FLAGS.map(({ flag, labelKey, color }) => (
        <FormControlLabel
          key={flag}
          control={
            <Switch
              checked={value[flag] === true}
              onChange={(e) => onChange({ ...value, [flag]: e.target.checked })}
              color={color}
            />
          }
          label={t(labelKey)}
        />
      ))}
    </Box>
  );
};
