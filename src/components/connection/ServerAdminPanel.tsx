import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box, Button, Typography, Paper, TextField, IconButton,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, Dialog, DialogTitle, DialogContent, DialogActions,
    Tooltip, CircularProgress, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import QRCode from 'qrcode';
import { storage } from '../../lib/storage';

/**
 * ServerAdminPanel [ID: COMP-SERVER-ADMIN]
 *
 * Admin panel for managing API keys on the Nexumia Server.
 * Only visible when connected with the master token.
 * Allows creating API keys for friends and generating shareable connection links.
 */

interface ApiKey {
    id: string;
    name: string;
    token: string;
    rateLimitSecond: number | null;
    rateLimitMinute: number | null;
    rateLimitHour: number | null;
    allowManagement: boolean;
    allowSongDeletion: boolean;
    createdAt: string;
}

type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

export const ServerAdminPanel: React.FC = () => {
    const { t } = useTranslation();
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [loadStatus, setLoadStatus] = useState<LoadStatus>('idle');
    const [error, setError] = useState('');

    // Create dialog state
    const [createOpen, setCreateOpen] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [creating, setCreating] = useState(false);

    // QR dialog state
    const [qrOpen, setQrOpen] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [qrKeyName, setQrKeyName] = useState('');

    const helperUrl = storage.getHelperUrl();
    const helperToken = storage.getHelperToken();

    const fetchApiKeys = useCallback(async () => {
        if (!helperUrl || !helperToken) return;

        setLoadStatus('loading');
        setError('');

        try {
            const cleanUrl = helperUrl.replace(/\/$/, '');
            const res = await fetch(`${cleanUrl}/api/config/apikeys`, {
                headers: { Authorization: `Bearer ${helperToken}` },
            });

            if (res.status === 403) {
                setLoadStatus('error');
                setError(t('server.admin.not_admin', 'You need the master token to manage API keys.'));
                return;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            setApiKeys(data);
            setLoadStatus('loaded');
        } catch (e: unknown) {
            setLoadStatus('error');
            const message = e instanceof Error ? e.message : 'Unknown error';
            setError(message);
        }
    }, [helperUrl, helperToken, t]);

    useEffect(() => {
        if (storage.isHelperActive()) {
            fetchApiKeys();
        }
    }, [fetchApiKeys]);

    const handleCreateKey = async () => {
        if (!newKeyName.trim()) return;
        setCreating(true);

        try {
            const cleanUrl = helperUrl.replace(/\/$/, '');
            const res = await fetch(`${cleanUrl}/api/config/apikeys`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${helperToken}`,
                },
                body: JSON.stringify({ name: newKeyName.trim() }),
            });

            if (!res.ok) throw new Error('Failed to create API key');

            setNewKeyName('');
            setCreateOpen(false);
            await fetchApiKeys();
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            setError(message);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteKey = async (id: string) => {
        try {
            const cleanUrl = helperUrl.replace(/\/$/, '');
            await fetch(`${cleanUrl}/api/config/apikeys/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${helperToken}` },
            });
            await fetchApiKeys();
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            setError(message);
        }
    };

    const generateConnectionLink = (key: ApiKey): string => {
        const cleanUrl = helperUrl.replace(/\/$/, '');
        return `${cleanUrl}?token=${key.token}`;
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
            setQrOpen(true);
        } catch {
            console.error('Failed to generate QR code');
        }
    };

    if (!storage.isHelperActive()) return null;

    return (
        <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                    <Typography variant="h6">
                        {t('server.admin.title', 'API Key Management')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('server.admin.desc', 'Create API keys for friends so they can connect to your server. Share a connection link or QR code.')}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateOpen(true)}
                    disabled={loadStatus !== 'loaded'}
                    sx={{ borderRadius: 50, px: 3 }}
                >
                    {t('server.admin.create', 'Create Key')}
                </Button>
            </Box>

            {loadStatus === 'loading' && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {loadStatus === 'error' && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loadStatus === 'loaded' && apiKeys.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    {t('server.admin.no_keys', 'No API keys yet. Create one to share access with friends.')}
                </Typography>
            )}

            {loadStatus === 'loaded' && apiKeys.length > 0 && (
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('server.admin.key_name', 'Name')}</TableCell>
                                <TableCell>{t('server.admin.key_permissions', 'Permissions')}</TableCell>
                                <TableCell>{t('server.admin.key_created', 'Created')}</TableCell>
                                <TableCell align="right">{t('server.admin.key_actions', 'Actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {apiKeys.map((key) => (
                                <TableRow key={key.id}>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                            {key.name}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                            {key.allowManagement && (
                                                <Chip label={t('server.admin.perm_manage', 'Admin')} size="small" color="warning" variant="outlined" />
                                            )}
                                            {key.allowSongDeletion && (
                                                <Chip label={t('server.admin.perm_delete', 'Delete Songs')} size="small" color="error" variant="outlined" />
                                            )}
                                            {!key.allowManagement && !key.allowSongDeletion && (
                                                <Chip label={t('server.admin.perm_readonly', 'Read Only')} size="small" color="default" variant="outlined" />
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(key.createdAt).toLocaleDateString()}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                            <Tooltip title={t('server.admin.copy_link', 'Copy Connection Link')}>
                                                <IconButton size="small" onClick={() => copyLink(key)}>
                                                    <ContentCopyIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={t('server.admin.show_qr', 'Show QR Code')}>
                                                <IconButton size="small" onClick={() => showQR(key)}>
                                                    <QrCode2Icon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={t('server.admin.delete_key', 'Delete Key')}>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDeleteKey(key.id)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Create Key Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{t('server.admin.create_title', 'Create API Key')}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label={t('server.admin.key_name_label', 'Key Name (e.g. friend\'s name)')}
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        sx={{ mt: 1 }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCreateKey();
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)}>
                        {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button
                        onClick={handleCreateKey}
                        variant="contained"
                        disabled={creating || !newKeyName.trim()}
                        startIcon={creating ? <CircularProgress size={16} /> : null}
                    >
                        {t('server.admin.create', 'Create Key')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* QR Code Dialog */}
            <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="xs">
                <DialogTitle>
                    {t('server.admin.qr_title', 'Connection QR Code')}
                </DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        {t('server.admin.qr_desc', 'Scan this QR code to connect to the server as "{{name}}"', { name: qrKeyName })}
                    </Typography>
                    {qrDataUrl && (
                        <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2 }}>
                            <img src={qrDataUrl} alt="QR Code" style={{ display: 'block', width: 250, height: 250 }} />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setQrOpen(false)}>
                        {t('common.close', 'Close')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};
