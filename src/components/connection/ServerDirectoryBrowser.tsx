import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, List, ListItemButton, ListItemIcon, ListItemText,
    Typography, Box, CircularProgress, Alert, IconButton
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import { melodiqFetch } from '../../games/melodiq';
import type { BrowseResponse } from './serverConfigTypes';

export interface ServerDirectoryBrowserProps {
    open: boolean;
    onClose: () => void;
    onSelect: (selectedPath: string) => void;
    title?: string;
    initialPath?: string;
    disablePortal?: boolean;
}

export const ServerDirectoryBrowser: React.FC<ServerDirectoryBrowserProps> = ({
    open,
    onClose,
    onSelect,
    title,
    initialPath,
    disablePortal,
}) => {
    const { t } = useTranslation();
    const [currentPath, setCurrentPath] = useState(initialPath || '');
    const [dirs, setDirs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadDirectory = useCallback(async (targetPath?: string) => {
        setLoading(true);
        setError(null);
        try {
            const query = targetPath ? `?path=${encodeURIComponent(targetPath)}` : '';
            const data = await melodiqFetch<BrowseResponse>(`/api/browse${query}`);
            if (data?.error) {
                throw new Error(data.error);
            }
            setCurrentPath(data.current || targetPath || '');
            setDirs(Array.isArray(data.dirs) ? data.dirs : []);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('server.browser.error', 'Could not load directory contents.');
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (open) {
            loadDirectory(initialPath || undefined);
        }
    }, [open, initialPath, loadDirectory]);

    const handleNavigate = (dirName: string) => {
        const nextPath = dirName === '..'
            ? `${currentPath}/..`
            : `${currentPath.replace(/\/+$/, '')}/${dirName}`;
        loadDirectory(nextPath);
    };

    const handleConfirm = () => {
        if (currentPath) {
            onSelect(currentPath);
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth disablePortal={disablePortal}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FolderOpenIcon color="primary" />
                    <Typography variant="h6">{title || t('server.browser.title', 'Select Server Directory')}</Typography>
                </Box>
                <IconButton size="small" onClick={onClose} aria-label={t('server.browser.cancel', 'Cancel')}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ minHeight: 320, maxHeight: 480 }}>
                <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                        {t('server.browser.current_path', 'Current Path')}:
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', flex: 1 }}>
                        {currentPath || '/'}
                    </Typography>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                        <CircularProgress size={36} />
                    </Box>
                ) : error ? (
                    <Alert
                        severity="error"
                        action={
                            <IconButton color="inherit" size="small" onClick={() => loadDirectory(currentPath)}>
                                <RefreshIcon fontSize="inherit" />
                            </IconButton>
                        }
                    >
                        {error}
                    </Alert>
                ) : (
                    <List dense disablePadding>
                        {dirs.filter(d => d === '..').map((d) => (
                            <ListItemButton key={d} onClick={() => handleNavigate(d)}>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    <ArrowUpwardIcon color="secondary" fontSize="small" />
                                </ListItemIcon>
                                <ListItemText primary={t('server.browser.up', 'Parent Directory')} />
                            </ListItemButton>
                        ))}
                        {dirs.filter(d => d !== '..').map((dirName) => (
                            <ListItemButton key={dirName} onClick={() => handleNavigate(dirName)}>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    <FolderIcon color="primary" fontSize="small" />
                                </ListItemIcon>
                                <ListItemText primary={dirName} />
                            </ListItemButton>
                        ))}
                        {dirs.length === 0 && (
                            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                                {t('server.browser.empty_folder', 'No subdirectories found in this folder.')}
                            </Typography>
                        )}
                    </List>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
                <Button onClick={onClose} color="inherit">
                    {t('server.browser.cancel', 'Cancel')}
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    disabled={!currentPath || loading}
                >
                    {t('server.browser.select_current', 'Select This Directory')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
