import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box, Button, Typography, Paper, TextField, IconButton,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, Dialog, DialogTitle, DialogContent, DialogActions,
    Tooltip, CircularProgress, Alert, FormControlLabel, Switch, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import QRCode from 'qrcode';
import { storage } from '../../lib/storage';

/**
 * ServerAdminPanel [ID: COMP-SERVER-ADMIN]
 *
 * Admin panel for managing API keys and permissions on the Nexumia Server.
 * Only visible when connected with the master token.
 * Allows creating and editing API keys with granular permissions,
 * as well as generating shareable web links and QR codes.
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
    const [newAllowManagement, setNewAllowManagement] = useState(false);
    const [newAllowSongDeletion, setNewAllowSongDeletion] = useState(false);
    const [creating, setCreating] = useState(false);

    // Edit dialog state
    const [editKey, setEditKey] = useState<ApiKey | null>(null);
    const [editAllowManagement, setEditAllowManagement] = useState(false);
    const [editAllowSongDeletion, setEditAllowSongDeletion] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);

    // QR dialog state
    const [qrOpen, setQrOpen] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [qrKeyName, setQrKeyName] = useState('');
    const [qrFullLink, setQrFullLink] = useState('');

    const [webAppUrl, setWebAppUrl] = useState(() => {
        return localStorage.getItem('nexumia_share_webapp_url') || window.location.origin;
    });

    useEffect(() => {
        localStorage.setItem('nexumia_share_webapp_url', webAppUrl);
    }, [webAppUrl]);

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

    const handleOpenCreate = () => {
        setNewKeyName('');
        setNewAllowManagement(false);
        setNewAllowSongDeletion(false);
        setCreateOpen(true);
    };

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
                body: JSON.stringify({
                    name: newKeyName.trim(),
                    allowManagement: newAllowManagement,
                    allowSongDeletion: newAllowSongDeletion,
                }),
            });

            if (!res.ok) throw new Error('Failed to create API key');

            setCreateOpen(false);
            await fetchApiKeys();
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            setError(message);
        } finally {
            setCreating(false);
        }
    };

    const handleOpenEdit = (key: ApiKey) => {
        setEditKey(key);
        setEditAllowManagement(key.allowManagement);
        setEditAllowSongDeletion(key.allowSongDeletion);
    };

    const handleSaveEdit = async () => {
        if (!editKey) return;
        setSavingEdit(true);

        try {
            const cleanUrl = helperUrl.replace(/\/$/, '');
            const res = await fetch(`${cleanUrl}/api/config/apikeys/${editKey.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${helperToken}`,
                },
                body: JSON.stringify({
                    allowManagement: editAllowManagement,
                    allowSongDeletion: editAllowSongDeletion,
                }),
            });

            if (!res.ok) throw new Error('Failed to update API key permissions');

            setEditKey(null);
            await fetchApiKeys();
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            setError(message);
        } finally {
            setSavingEdit(false);
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
        const cleanWeb = webAppUrl.trim().replace(/\/$/, '');
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
                    onClick={handleOpenCreate}
                    disabled={loadStatus !== 'loaded'}
                    sx={{ borderRadius: 50, px: 3 }}
                >
                    {t('server.admin.create', 'Create Key')}
                </Button>
            </Box>

            {/* Web App URL Configuration */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <Typography variant="subtitle2" gutterBottom>
                    {t('server.admin.webapp_url', 'Web App Base URL')}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {t('server.admin.webapp_url_desc', 'The web application address that friends will open. Links and QR codes will point here and automatically configure the server.')}
                </Typography>
                <TextField
                    value={webAppUrl}
                    onChange={(e) => setWebAppUrl(e.target.value)}
                    size="small"
                    fullWidth
                    variant="outlined"
                    placeholder="https://nexumia.de"
                />
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
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                                            {key.allowManagement && (
                                                <Chip
                                                    label={t('server.admin.perm_manage', 'Admin')}
                                                    size="small"
                                                    color="warning"
                                                    variant="outlined"
                                                />
                                            )}
                                            {key.allowSongDeletion && (
                                                <Chip
                                                    label={t('server.admin.perm_delete', 'Delete Songs')}
                                                    size="small"
                                                    color="error"
                                                    variant="outlined"
                                                />
                                            )}
                                            {!key.allowManagement && !key.allowSongDeletion && (
                                                <Chip
                                                    label={t('server.admin.perm_readonly', 'Read Only')}
                                                    size="small"
                                                    color="success"
                                                    variant="outlined"
                                                />
                                            )}
                                            <Tooltip title={t('server.admin.edit_permissions', 'Edit Permissions')}>
                                                <IconButton size="small" onClick={() => handleOpenEdit(key)}>
                                                    <EditIcon fontSize="small" sx={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.6)' }} />
                                                </IconButton>
                                            </Tooltip>
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
                        sx={{ mt: 1, mb: 2 }}
                    />

                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                        {t('server.admin.key_permissions', 'Permissions')}
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                        <Box>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={newAllowManagement}
                                        onChange={(e) => setNewAllowManagement(e.target.checked)}
                                        color="warning"
                                    />
                                }
                                label={t('server.admin.perm_manage', 'Admin / Server Management')}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
                                {t('server.admin.perm_manage_desc', 'Allows accessing the admin dashboard, changing music directories, and managing other API keys.')}
                            </Typography>
                        </Box>

                        <Box>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={newAllowSongDeletion}
                                        onChange={(e) => setNewAllowSongDeletion(e.target.checked)}
                                        color="error"
                                    />
                                }
                                label={t('server.admin.perm_delete', 'Delete Songs')}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
                                {t('server.admin.perm_delete_desc', 'Allows permanently deleting song files from the hard drive.')}
                            </Typography>
                        </Box>
                    </Box>

                    {!newAllowManagement && !newAllowSongDeletion && (
                        <Alert severity="info" icon={<InfoOutlinedIcon fontSize="small" />} sx={{ mt: 1 }}>
                            <Typography variant="caption">
                                {t('server.admin.perm_readonly_desc', 'Read-Only Mode: Can search songs, stream audio/video, and sing, but cannot delete files or modify server settings.')}
                            </Typography>
                        </Alert>
                    )}
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

            {/* Edit Permissions Dialog */}
            <Dialog open={!!editKey} onClose={() => setEditKey(null)} maxWidth="xs" fullWidth>
                <DialogTitle>
                    {t('server.admin.edit_permissions', 'Edit Permissions')} – {editKey?.name}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                        {t('server.admin.perm_desc', 'Permissions control what this key is allowed to do on your server.')}
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                        <Box>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={editAllowManagement}
                                        onChange={(e) => setEditAllowManagement(e.target.checked)}
                                        color="warning"
                                    />
                                }
                                label={t('server.admin.perm_manage', 'Admin / Server Management')}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
                                {t('server.admin.perm_manage_desc', 'Allows accessing the admin dashboard, changing music directories, and managing other API keys.')}
                            </Typography>
                        </Box>

                        <Divider />

                        <Box>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={editAllowSongDeletion}
                                        onChange={(e) => setEditAllowSongDeletion(e.target.checked)}
                                        color="error"
                                    />
                                }
                                label={t('server.admin.perm_delete', 'Delete Songs')}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
                                {t('server.admin.perm_delete_desc', 'Allows permanently deleting song files from the hard drive.')}
                            </Typography>
                        </Box>
                    </Box>

                    {!editAllowManagement && !editAllowSongDeletion && (
                        <Alert severity="info" icon={<InfoOutlinedIcon fontSize="small" />} sx={{ mt: 1 }}>
                            <Typography variant="caption">
                                {t('server.admin.perm_readonly_desc', 'Read-Only Mode: Can search songs, stream audio/video, and sing, but cannot delete files or modify server settings.')}
                            </Typography>
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditKey(null)}>
                        {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button
                        onClick={handleSaveEdit}
                        variant="contained"
                        disabled={savingEdit}
                        startIcon={savingEdit ? <CircularProgress size={16} /> : null}
                    >
                        {t('server.admin.save', 'Save Changes')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* QR Code Dialog */}
            <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {t('server.admin.qr_title', 'Connection QR Code')}
                </DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                        {t('server.admin.qr_desc', 'Scan this QR code to connect to the server as "{{name}}"', { name: qrKeyName })}
                    </Typography>
                    {qrDataUrl && (
                        <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, boxShadow: 3 }}>
                            <img src={qrDataUrl} alt="QR Code" style={{ display: 'block', width: 250, height: 250 }} />
                        </Box>
                    )}
                    {qrFullLink && (
                        <Box sx={{ width: '100%', mt: 1, display: 'flex', gap: 1 }}>
                            <TextField
                                value={qrFullLink}
                                size="small"
                                fullWidth
                                variant="outlined"
                                slotProps={{ input: { readOnly: true } }}
                                sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                            />
                            <Tooltip title={t('server.admin.copy_link', 'Copy Connection Link')}>
                                <Button
                                    variant="outlined"
                                    startIcon={<ContentCopyIcon />}
                                    onClick={() => navigator.clipboard.writeText(qrFullLink)}
                                    sx={{ whiteSpace: 'nowrap' }}
                                >
                                    {t('common.copy', 'Copy')}
                                </Button>
                            </Tooltip>
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
