import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    FormControlLabel, Switch, Divider
} from '@mui/material';
import type { ApiKey } from '../hooks/useServerApiKeys';

interface Props {
    keyData: ApiKey | null;
    onClose: () => void;
    onSave: (id: string, allowManagement: boolean, allowSongDeletion: boolean) => Promise<void>;
}

export const EditKeyDialog: React.FC<Props> = ({ keyData, onClose, onSave }) => {
    const { t } = useTranslation();
    const [allowManagement, setAllowManagement] = useState(false);
    const [allowSongDeletion, setAllowSongDeletion] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (keyData) {
            setAllowManagement(keyData.allowManagement);
            setAllowSongDeletion(keyData.allowSongDeletion);
            setSaving(false);
        }
    }, [keyData]);

    const handleSave = async () => {
        if (!keyData) return;
        setSaving(true);
        try {
            await onSave(keyData.id, allowManagement, allowSongDeletion);
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={!!keyData} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{t('server.admin.edit_permissions', 'Edit Permissions')} – {keyData?.name}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, mb: 2 }}>
                    <FormControlLabel
                        control={<Switch checked={allowManagement} onChange={(e) => setAllowManagement(e.target.checked)} color="warning" />}
                        label={t('server.admin.perm_manage', 'Admin / Server Management')}
                    />
                    <Divider />
                    <FormControlLabel
                        control={<Switch checked={allowSongDeletion} onChange={(e) => setAllowSongDeletion(e.target.checked)} color="error" />}
                        label={t('server.admin.perm_delete', 'Delete Songs')}
                    />
                </Box>
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
