import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box, Button, Typography, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
    FormControlLabel, Switch
} from '@mui/material';

interface Props {
    open: boolean;
    onClose: () => void;
    onCreate: (name: string, allowManagement: boolean, allowSongDeletion: boolean) => Promise<void>;
}

export const CreateKeyDialog: React.FC<Props> = ({ open, onClose, onCreate }) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [allowManagement, setAllowManagement] = useState(false);
    const [allowSongDeletion, setAllowSongDeletion] = useState(false);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (open) {
            setName('');
            setAllowManagement(false);
            setAllowSongDeletion(false);
            setCreating(false);
        }
    }, [open]);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setCreating(true);
        try {
            await onCreate(name, allowManagement, allowSongDeletion);
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
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                    <Box>
                        <FormControlLabel
                            control={<Switch checked={allowManagement} onChange={(e) => setAllowManagement(e.target.checked)} color="warning" />}
                            label={t('server.admin.perm_manage', 'Admin / Server Management')}
                        />
                    </Box>
                    <Box>
                        <FormControlLabel
                            control={<Switch checked={allowSongDeletion} onChange={(e) => setAllowSongDeletion(e.target.checked)} color="error" />}
                            label={t('server.admin.perm_delete', 'Delete Songs')}
                        />
                    </Box>
                </Box>
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
