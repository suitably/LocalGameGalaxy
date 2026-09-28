import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box, Button, Typography, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface Props {
    open: boolean;
    onClose: () => void;
    dataUrl: string;
    keyName: string;
    fullLink: string;
}

export const QrCodeDialog: React.FC<Props> = ({ open, onClose, dataUrl, keyName, fullLink }) => {
    const { t } = useTranslation();

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{t('server.admin.qr_title', 'Connection QR Code')}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    {t('server.admin.qr_desc', 'Scan this QR code to connect to the server as "{{name}}"', { name: keyName })}
                </Typography>
                {dataUrl && (
                    <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, boxShadow: 3 }}>
                        <img src={dataUrl} alt={t('server.admin.qr_alt', 'QR Code')} style={{ display: 'block', width: 250, height: 250 }} />
                    </Box>
                )}
                {fullLink && (
                    <Box sx={{ width: '100%', mt: 1, display: 'flex', gap: 1 }}>
                        <TextField value={fullLink} size="small" fullWidth variant="outlined" slotProps={{ input: { readOnly: true } }} sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }} />
                        <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => navigator.clipboard.writeText(fullLink)} sx={{ whiteSpace: 'nowrap' }}>
                            {t('common.copy', 'Copy')}
                        </Button>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('common.close', 'Close')}</Button>
            </DialogActions>
        </Dialog>
    );
};
