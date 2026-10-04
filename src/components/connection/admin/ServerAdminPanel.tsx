import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box, Button, Typography, Paper, TextField, Alert, CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import { settingsCardSx } from '../../../features/settings/settingsStyles';
import { useServerApiKeys, type ApiKey } from '../hooks/useServerApiKeys';
import { ApiKeyTable } from './ApiKeyTable';
import { CreateKeyDialog } from './CreateKeyDialog';
import { EditKeyDialog } from './EditKeyDialog';
import { QrCodeDialog } from './QrCodeDialog';
import QRCode from 'qrcode';

export const ServerAdminPanel: React.FC = () => {
    const { t } = useTranslation();
    const { apiKeys, loadStatus, error, fetchApiKeys, createKey, updateKey, deleteKey } = useServerApiKeys();

    const [createOpen, setCreateOpen] = useState(false);
    const [editKey, setEditKey] = useState<ApiKey | null>(null);

    const [qrOpen, setQrOpen] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [qrKeyName, setQrKeyName] = useState('');
    const [qrFullLink, setQrFullLink] = useState('');

    const [webAppUrl, setWebAppUrl] = useState(() => storage.get(STORAGE_KEYS.SHARE_WEBAPP_URL, window.location.origin));

    const handleWebAppUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setWebAppUrl(e.target.value);
        storage.set(STORAGE_KEYS.SHARE_WEBAPP_URL, e.target.value);
    };

    const generateConnectionLink = (key: ApiKey): string => {
        const cleanWeb = webAppUrl.trim().replace(/\/$/, '');
        const helperUrl = storage.getHelperUrl();
        const cleanServer = helperUrl.trim().replace(/\/$/, '');
        return `${cleanWeb}/?serverUrl=${encodeURIComponent(cleanServer)}&token=${encodeURIComponent(key.token)}`;
    };

    const copyLink = (key: ApiKey) => {
        navigator.clipboard.writeText(generateConnectionLink(key));
    };

    const showQR = async (key: ApiKey) => {
        try {
            const link = generateConnectionLink(key);
            const dataUrl = await QRCode.toDataURL(link, { width: 300, margin: 2 });
            setQrDataUrl(dataUrl);
            setQrKeyName(key.name);
            setQrFullLink(link);
            setQrOpen(true);
        } catch {
            console.error('Failed to generate QR code');
        }
    };

    if (!storage.isHelperActive()) return null;

    return (
        <Paper sx={settingsCardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {t('server.admin.title', 'API Key Management')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('server.admin.desc', 'Create API keys for friends so they can connect to your server. Share a connection link or QR code.')}
                    </Typography>
                </Box>
                {loadStatus === 'loaded' && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ borderRadius: 50, px: 3 }}>
                        {t('server.admin.create', 'Create Key')}
                    </Button>
                )}
            </Box>

            {loadStatus === 'idle' && (
                <Alert severity="info" sx={{ mt: 2, bgcolor: 'rgba(2, 136, 209, 0.1)', border: '1px solid rgba(2, 136, 209, 0.3)' }}>
                    <Typography variant="body2">
                        {t('server.admin.need_token', 'Enter your Master Security Token above and test the connection to manage API keys for friends.')}
                    </Typography>
                </Alert>
            )}

            {loadStatus === 'forbidden' && (
                <Alert severity="warning" sx={{ mt: 2, bgcolor: 'rgba(237, 108, 2, 0.1)', border: '1px solid rgba(237, 108, 2, 0.3)' }}>
                    <Typography variant="body2">
                        {t('server.admin.forbidden', 'You are connected with a standard API key. API key management is only available with the Master Security Token.')}
                    </Typography>
                </Alert>
            )}

            {loadStatus === 'loading' && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress size={32} />
                </Box>
            )}

            {loadStatus === 'error' && (
                <Alert
                    severity="error"
                    sx={{ mt: 2, bgcolor: 'rgba(211, 47, 47, 0.1)', border: '1px solid rgba(211, 47, 47, 0.3)' }}
                    action={
                        <Button color="inherit" size="small" startIcon={<RefreshIcon />} onClick={() => fetchApiKeys(true)}>
                            {t('server.admin.retry', 'Retry')}
                        </Button>
                    }
                >
                    <Typography variant="body2">{error}</Typography>
                </Alert>
            )}

            {loadStatus === 'loaded' && (
                <>
                    <Box sx={{ my: 3, p: 2, bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <Typography variant="subtitle2" gutterBottom>
                            {t('server.admin.webapp_url', 'Web App Base URL')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            {t('server.admin.webapp_url_desc', 'The web application address that friends will open. Links and QR codes will point here and automatically configure the server.')}
                        </Typography>
                        <TextField
                            value={webAppUrl}
                            onChange={handleWebAppUrlChange}
                            size="small"
                            fullWidth
                            variant="outlined"
                            placeholder="https://nexumia.de"
                        />
                    </Box>

                    {apiKeys.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                            {t('server.admin.no_keys', 'No API keys yet. Create one to share access with friends.')}
                        </Typography>
                    ) : (
                        <ApiKeyTable apiKeys={apiKeys} onEdit={setEditKey} onDelete={deleteKey} onCopyLink={copyLink} onShowQR={showQR} />
                    )}
                </>
            )}

            <CreateKeyDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createKey} />
            <EditKeyDialog keyData={editKey} onClose={() => setEditKey(null)} onSave={updateKey} />
            <QrCodeDialog open={qrOpen} onClose={() => setQrOpen(false)} dataUrl={qrDataUrl} keyName={qrKeyName} fullLink={qrFullLink} />
        </Paper>
    );
};
