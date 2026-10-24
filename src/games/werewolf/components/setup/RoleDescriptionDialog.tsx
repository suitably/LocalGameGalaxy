import React from 'react';
import { Box, Button, Dialog, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { RoleDefinition } from '../../logic/types';
import { RoleIcon } from '../RoleIcon';

interface RoleDescriptionDialogProps {
  role: RoleDefinition | null;
  onClose: () => void;
}

export const RoleDescriptionDialog: React.FC<RoleDescriptionDialogProps> = ({ role, onClose }) => {
  const { t } = useTranslation();
  return (
    <Dialog open={Boolean(role)} onClose={onClose} maxWidth="xs" fullWidth>
      {role && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h3" gutterBottom>
            <RoleIcon icon={role.icon} fontSize="inherit" />
          </Typography>
          <Typography variant="h5" gutterBottom>
            {role.isCustom ? role.name : t(`games.werewolf.roles.${role.id}`)}
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
            {role.isCustom ? role.description : t(`games.werewolf.role_descriptions.${role.id}`)}
          </Typography>
          <Button variant="outlined" fullWidth onClick={onClose}>
            {t('common.close')}
          </Button>
        </Box>
      )}
    </Dialog>
  );
};
