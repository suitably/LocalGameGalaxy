import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import type { ApiKey, ApiKeyPermissions } from '../hooks/useServerApiKeys';
import { PermissionSwitches } from './PermissionSwitches';
import { NO_PERMISSIONS, pickPermissions } from './permissionFlags';

interface Props {
  keyData: ApiKey | null;
  onClose: () => void;
  onSave: (id: string, permissions: ApiKeyPermissions) => Promise<void>;
}

export const EditKeyDialog: React.FC<Props> = ({ keyData, onClose, onSave }) => {
  const { t } = useTranslation();
  const [permissions, setPermissions] = useState<ApiKeyPermissions>(NO_PERMISSIONS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (keyData) {
      setPermissions(pickPermissions(keyData));
      setSaving(false);
    }
  }, [keyData]);

  const handleSave = async () => {
    if (!keyData) return;
    setSaving(true);
    try {
      await onSave(keyData.id, permissions);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!keyData} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {t('server.admin.edit_permissions', 'Edit Permissions')} – {keyData?.name}
      </DialogTitle>
      <DialogContent>
        <PermissionSwitches value={permissions} onChange={setPermissions} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {t('server.admin.save', 'Save Changes')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
