import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Chip,
    CircularProgress,
    Alert,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import CasinoIcon from '@mui/icons-material/Casino';
import VpnLockIcon from '@mui/icons-material/VpnLock';
import PublicOffIcon from '@mui/icons-material/PublicOff';
import { useTranslation } from 'react-i18next';
import { settingsCardSx } from '../../settingsStyles';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { useTabletopCompanion } from './useTabletopCompanion';

export const TabletopCompanionConfig: React.FC = () => {
    const { t } = useTranslation();
    const {
        serverUrl,
        isServerActive,
        directories,
        scanning,
        gamesCount,
        tunnelActive,
        loading,
        actionLoading,
        error,
        rescan,
        addDirectory,
        removeDirectory,
    } = useTabletopCompanion();

    const [newDir, setNewDir] = useState('');
    const [dirToDelete, setDirToDelete] = useState<string | null>(null);

    const handleAdd = async () => {
        if (!newDir.trim()) return;
        await addDirectory(newDir);
        setNewDir('');
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {error && <Alert severity="error">{error}</Alert>}

            {/* 1. Connection Info */}
            <Paper sx={settingsCardSx}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <CasinoIcon sx={{ color: '#ce93d8', fontSize: 28 }} />
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700}>
                            {t('settings.companion_tabletop_url_title', 'Tabletop Server Connection')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {isServerActive ? serverUrl : t('server.connection.status_disconnected', 'Nicht verbunden')}
                        </Typography>
                    </Box>
                    <Chip
                        label={isServerActive ? t('common.active', 'Aktiv') : t('common.inactive', 'Inaktiv')}
                        color={isServerActive ? 'success' : 'default'}
                        size="small"
                    />
                </Box>
            </Paper>

            {/* 2. Status Card */}
            <Paper sx={settingsCardSx}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                            label={t('settings.companion_tabletop_status_games', '{{count}} games available', { count: gamesCount })}
                            color="primary"
                            variant="outlined"
                        />
                        {scanning && (
                            <Chip
                                icon={<CircularProgress size={14} color="inherit" />}
                                label={t('settings.companion_tabletop_status_scanning', 'Scanning...')}
                                color="warning"
                                size="small"
                            />
                        )}
                        <Chip
                            icon={tunnelActive ? <VpnLockIcon fontSize="small" /> : <PublicOffIcon fontSize="small" />}
                            label={tunnelActive
                                ? t('settings.companion_tabletop_tunnel_active', 'Public tunnel active')
                                : t('settings.companion_tabletop_tunnel_inactive', 'No tunnel — only available on local network')}
                            color={tunnelActive ? 'info' : 'default'}
                            size="small"
                            variant="outlined"
                        />
                    </Box>

                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={actionLoading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                        onClick={rescan}
                        disabled={actionLoading || !isServerActive}
                        sx={{ textTransform: 'none' }}
                    >
                        {t('settings.companion_tabletop_rescan', 'Rescan')}
                    </Button>
                </Box>
            </Paper>

            {/* 3. Directory Manager */}
            <Paper sx={settingsCardSx}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                    {t('settings.companion_tabletop_dir_title', 'Game Directories')}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="/path/to/tabletop/games"
                        value={newDir}
                        onChange={(e) => setNewDir(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        disabled={actionLoading || !isServerActive}
                    />
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={handleAdd}
                        disabled={!newDir.trim() || actionLoading || !isServerActive}
                        sx={{ textTransform: 'none', px: 2, whiteSpace: 'nowrap' }}
                    >
                        {t('settings.companion_tabletop_dir_add', 'Add directory')}
                    </Button>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : (
                    <List dense disablePadding>
                        {directories.map((dir) => (
                            <ListItem
                                key={dir}
                                sx={{
                                    bgcolor: 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: 1.5,
                                    mb: 0.75,
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                }}
                            >
                                <FolderIcon sx={{ color: '#ce93d8', mr: 1.5, fontSize: 20 }} />
                                <ListItemText primary={dir} primaryTypographyProps={{ variant: 'body2', fontFamily: 'monospace' }} />
                                <ListItemSecondaryAction>
                                    <IconButton
                                        edge="end"
                                        size="small"
                                        onClick={() => setDirToDelete(dir)}
                                        disabled={actionLoading}
                                        aria-label={t('settings.companion_tabletop_dir_remove', 'Remove')}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Paper>

            <ConfirmDialog
                open={Boolean(dirToDelete)}
                title={t('settings.companion_tabletop_dir_remove', 'Remove')}
                message={dirToDelete || ''}
                confirmColor="error"
                onConfirm={() => {
                    if (dirToDelete) removeDirectory(dirToDelete);
                    setDirToDelete(null);
                }}
                onCancel={() => setDirToDelete(null)}
            />
        </Box>
    );
};
