import React from 'react';
import { Box, Typography, Button, Paper, Alert, Chip, LinearProgress } from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import RefreshIcon from '@mui/icons-material/Refresh';
import FolderDeleteIcon from '@mui/icons-material/FolderDelete';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { useTranslation } from 'react-i18next';
import { useSongs } from '../hooks/useSongs';

export const LocalLibrarySettings: React.FC = () => {
    const { t } = useTranslation();
    const { localLibrary } = useSongs();

    const {
        isSupported,
        hasFolder,
        folderName,
        permissionStatus,
        isScanning,
        scanProgress,
        localSongs,
        selectFolder,
        requestFolderPermission,
        rescanFolder,
        disconnectFolder
    } = localLibrary;

    return (
        <Paper
            sx={{
                p: 3,
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <FolderOpenIcon color="primary" />
                    <Typography variant="h6">
                        {t('melodiq.local_folder', 'Lokaler Song-Ordner')}
                    </Typography>
                </Box>
                <Chip
                    label={t('melodiq.lite_mode', 'Lite-Modus')}
                    size="small"
                    color="success"
                    variant="outlined"
                />
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('melodiq.local_folder_desc', 'Lade UltraStar-Songs direkt aus einem lokalen Ordner auf deiner Festplatte – komplett ohne Server.')}
            </Typography>

            {!isSupported && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    {t('melodiq.browser_unsupported_fs', 'Die File System Access API wird in diesem Browser nicht unterstützt. Bitte nutze Google Chrome, Microsoft Edge oder Opera für den Lite-Modus.')}
                </Alert>
            )}

            {isSupported && (
                <>
                    {hasFolder ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'rgba(255,255,255,0.03)', p: 1.5, borderRadius: 1 }}>
                                <Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                        {folderName}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {t('melodiq.songs_found_count', { count: localSongs.length })}
                                    </Typography>
                                </Box>
                                {permissionStatus === 'prompt' && (
                                    <Button
                                        variant="contained"
                                        color="warning"
                                        size="small"
                                        startIcon={<LockOpenIcon />}
                                        onClick={requestFolderPermission}
                                    >
                                        {t('melodiq.grant_folder_permission', 'Zugriff erlauben')}
                                    </Button>
                                )}
                            </Box>

                            {isScanning && (
                                <Box sx={{ width: '100%', my: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="caption">{t('melodiq.scanning_folder', 'Scanne Ordner...')}</Typography>
                                        <Typography variant="caption">{scanProgress?.foundSongs || 0} Songs</Typography>
                                    </Box>
                                    <LinearProgress />
                                </Box>
                            )}

                            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<FolderOpenIcon />}
                                    onClick={selectFolder}
                                    disabled={isScanning}
                                >
                                    {t('melodiq.change_local_folder', 'Ordner wechseln')}
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<RefreshIcon />}
                                    onClick={rescanFolder}
                                    disabled={isScanning || permissionStatus !== 'granted'}
                                >
                                    {t('melodiq.rescan_local_folder', 'Neu scannen')}
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    startIcon={<FolderDeleteIcon />}
                                    onClick={disconnectFolder}
                                    disabled={isScanning}
                                >
                                    {t('melodiq.disconnect_local_folder', 'Ordner trennen')}
                                </Button>
                            </Box>
                        </Box>
                    ) : (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<FolderOpenIcon />}
                            onClick={selectFolder}
                            disabled={isScanning}
                        >
                            {t('melodiq.open_local_folder', 'Lokalen Ordner öffnen')}
                        </Button>
                    )}
                </>
            )}
        </Paper>
    );
};
