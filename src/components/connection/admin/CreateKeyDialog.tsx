import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import type { ApiKeyPermissions } from '../hooks/useServerApiKeys';
import { PermissionSwitches } from './PermissionSwitches';
import { NO_PERMISSIONS } from './permissionFlags';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, permissions: ApiKeyPermissions) => Promise<void>;
}

export const CreateKeyDialog: React.FC<Props> = ({ open, onClose, onCreate }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<ApiKeyPermissions>(NO_PERMISSIONS);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setPermissions(NO_PERMISSIONS);
      setCreating(false);
    }
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await onCreate(name, permissions);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('server.admin.create_title', 'Create API Key')}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label={t('server.admin.key_name_label', "Key Name (e.g. friend's name)")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mt: 1, mb: 2 }}
        />
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
          {t('server.admin.key_permissions', 'Permissions')}
        </Typography>
        <PermissionSwitches value={permissions} onChange={setPermissions} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
        <Button onClick={handleCreate} variant="contained" disabled={creating || !name.trim()}>
          {t('server.admin.create', 'Create Key')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
