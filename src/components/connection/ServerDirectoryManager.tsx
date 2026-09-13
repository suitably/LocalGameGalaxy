import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box, Button, Typography, Paper, IconButton,
    List, ListItem, ListItemText, ListItemSecondaryAction,
    Divider, CircularProgress, Alert, Tooltip
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import { storage } from '../../lib/storage';
import { settingsCardSx } from '../../features/settings/settingsStyles';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { melodiqFetch } from '../../games/melodiq';
import { ServerDirectoryBrowser } from './ServerDirectoryBrowser';
import type { DownloadDirResponse } from './serverConfigTypes';

export const ServerDirectoryManager: React.FC = () => {
    const { t } = useTranslation();
    const [isServerActive, setIsServerActive] = useState(() => storage.isHelperActive());
    const [directories, setDirectories] = useState<string[]>([]);
    const [downloadDir, setDownloadDir] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Browser dialog state
    const [browserMode, setBrowserMode] = useState<'library' | 'download' | null>(null);

    // Delete confirmation state
    const [dirToDelete, setDirToDelete] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!storage.isHelperActive()) return;
        setLoading(true);
        setError(null);
        try {
            const [dirsRes, downloadRes] = await Promise.all([
                melodiqFetch<string[] | { directories?: string[] }>('/api/config/directories'),
                melodiqFetch<DownloadDirResponse>('/api/config/download-dir')
            ]);

            const dirsList = Array.isArray(dirsRes) ? dirsRes : dirsRes?.directories || [];
            setDirectories(dirsList);
            setDownloadDir(downloadRes?.downloadDir || null);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('server.directories.error_load', 'Failed to load directories');
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        const handleUpdate = () => {
            const active = storage.isHelperActive();
            setIsServerActive(active);
            if (active) {
                loadData();
            }
        };

        handleUpdate();
        window.addEventListener('server_connection_updated', handleUpdate);
        return () => window.removeEventListener('server_connection_updated', handleUpdate);
    }, [loadData]);

    const handleAddDirectory = async (selectedPath: string) => {
        try {
            setError(null);
            const res = await melodiqFetch<string[] | { directories?: string[] }>('/api/config/directories', {
                method: 'POST',
                body: JSON.stringify({ path: selectedPath })
            });
            const updated = Array.isArray(res) ? res : res?.directories || [];
            setDirectories(updated);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('server.directories.error_add', 'Failed to add directory');
            setError(msg);
        }
    };

    const handleConfirmDelete = async () => {
        if (!dirToDelete) return;
        try {
            setError(null);
            const res = await melodiqFetch<string[] | { directories?: string[] }>('/api/config/directories', {
                method: 'DELETE',
                body: JSON.stringify({ path: dirToDelete })
            });
            const updated = Array.isArray(res) ? res : res?.directories || [];
            setDirectories(updated);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('server.directories.error_remove', 'Failed to remove directory');
            setError(msg);
        } finally {
            setDirToDelete(null);
        }
    };

    const handleSetDownloadDir = async (selectedPath: string) => {
        try {
            setError(null);
            const res = await melodiqFetch<DownloadDirResponse>('/api/config/download-dir', {
                method: 'POST',
                body: JSON.stringify({ dir: selectedPath, path: selectedPath })
            });
            setDownloadDir(res?.downloadDir || selectedPath);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('server.directories.error_set_download', 'Failed to set download directory');
            setError(msg);
        }
    };

    if (!isServerActive) {
        return null;
    }

    return (
        <Paper sx={settingsCardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Box>
                    <Typography variant="h6">{t('server.directories.title', 'Library Directories')}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('server.directories.desc', 'Manage scanned server directories for songs.')}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setBrowserMode('library')}
                >
                    {t('server.directories.add_btn', 'Add Directory')}
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ my: 1.5 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress size={28} />
                </Box>
            ) : (
                <List dense sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 0.5, mb: 3 }}>
                    {directories.length === 0 ? (
                        <ListItem>
                            <ListItemText
                                secondary={t('server.directories.empty', 'No library directories configured yet.')}
                            />
                        </ListItem>
                    ) : (
                        directories.map((dir) => (
                            <ListItem key={dir} divider sx={{ py: 0.75 }}>
                                <FolderIcon color="primary" sx={{ mr: 1.5, fontSize: 20 }} />
                                <ListItemText
                                    primary={dir}
                                    primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                                />
                                <ListItemSecondaryAction>
                                    <Tooltip title={t('server.directories.remove', 'Remove')}>
                                        <IconButton
                                            edge="end"
                                            size="small"
                                            color="error"
                                            onClick={() => setDirToDelete(dir)}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))
                    )}
                </List>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Download Directory */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DownloadIcon color="action" fontSize="small" />
                        <Typography variant="subtitle2">
                            {t('server.directories.download_dir_title', 'Download Directory')}
                        </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {t('server.directories.download_dir_desc', 'Folder for downloaded songs and stems.')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', p: 1, borderRadius: 1 }}>
                        {downloadDir || t('server.directories.empty', 'Not configured')}
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => setBrowserMode('download')}
                >
                    {t('server.directories.change_download_dir', 'Change')}
                </Button>
            </Box>

            <ServerDirectoryBrowser
                open={Boolean(browserMode)}
                initialPath={browserMode === 'download' ? downloadDir || undefined : undefined}
                title={browserMode === 'download'
                    ? t('server.directories.download_dir_title', 'Download Directory')
                    : t('server.directories.add_btn', 'Add Directory')}
                onClose={() => setBrowserMode(null)}
                onSelect={(selectedPath) => {
                    if (browserMode === 'library') {
                        handleAddDirectory(selectedPath);
                    } else if (browserMode === 'download') {
                        handleSetDownloadDir(selectedPath);
                    }
                }}
            />

            <ConfirmDialog
                open={Boolean(dirToDelete)}
                title={t('server.directories.confirm_remove_title', 'Remove Directory')}
                message={t('server.directories.confirm_remove_message', {
                    path: dirToDelete || '',
                    defaultValue: `Remove directory ${dirToDelete}?`
                })}
                confirmColor="error"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDirToDelete(null)}
            />
        </Paper>
    );
};
