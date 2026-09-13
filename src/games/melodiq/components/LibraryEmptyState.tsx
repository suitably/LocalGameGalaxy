import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { useTranslation } from 'react-i18next';
import { useSongs } from '../hooks/useSongs';

interface LibraryEmptyStateProps {
    hasConnectionError: boolean;
    isLoading: boolean;
    songsLength: number;
    isOnlineSearch: boolean;
    refreshSongs: () => void;
}

export const LibraryEmptyState: React.FC<LibraryEmptyStateProps> = ({
    hasConnectionError, songsLength, isOnlineSearch, refreshSongs
}) => {
    const { t } = useTranslation();
    const { localLibrary } = useSongs();

    if (hasConnectionError) {
        return (
            <Box sx={{ width: '100%', textAlign: 'center', py: 6, px: 2, opacity: 0.9, flexGrow: 1, maxWidth: 650, mx: 'auto' }}>
                <Typography variant="h5">{t('melodiq.cannot_connect')}</Typography>
                <Typography sx={{ mt: 1, mb: 3, color: 'text.secondary' }}>
                    {t('melodiq.helper_required')}
                </Typography>

                {localLibrary.isSupported ? (
                    <Box sx={{ mb: 4, p: 2.5, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                            {t('melodiq.lite_mode', 'Lite-Modus (Serverlos)')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {t('melodiq.local_folder_desc', 'Lade UltraStar-Songs direkt aus einem lokalen Ordner auf deiner Festplatte – komplett ohne Server.')}
                        </Typography>

                        {localLibrary.hasFolder && localLibrary.permissionStatus === 'prompt' ? (
                            <Button
                                variant="contained"
                                color="warning"
                                startIcon={<LockOpenIcon />}
                                onClick={localLibrary.requestFolderPermission}
                                sx={{ borderRadius: 50, px: 3, py: 1 }}
                            >
                                {t('melodiq.grant_folder_permission', 'Zugriff auf {{name}} erlauben', { name: localLibrary.folderName })}
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<FolderOpenIcon />}
                                onClick={localLibrary.selectFolder}
                                sx={{ borderRadius: 50, px: 3, py: 1 }}
                            >
                                {t('melodiq.open_local_folder', 'Lokalen Ordner öffnen')}
                            </Button>
                        )}
                    </Box>
                ) : (
                    <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                        {t('melodiq.browser_unsupported_fs', 'Die File System Access API wird in diesem Browser nicht unterstützt. Bitte nutze Google Chrome, Microsoft Edge oder Opera für den Lite-Modus.')}
                    </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => {
                            let filename = 'melodiq-server-win.zip';
                            if (navigator.userAgent.includes('Mac')) {
                                filename = 'melodiq-server-macos.tar.gz';
                            } else if (navigator.userAgent.includes('Linux') && !navigator.userAgent.includes('Android')) {
                                filename = 'melodiq-server-linux.tar.gz';
                            }
                            window.location.href = `https://github.com/suitably/LocalGameGalaxy/releases/latest/download/${filename}`;
                        }}
                        sx={{ borderRadius: 50, px: 3, py: 1 }}
                    >
                        {t('melodiq.download_helper')}
                    </Button>
                    <Button
                        onClick={refreshSongs}
                        variant="outlined"
                        sx={{ borderRadius: 50, px: 3, py: 1 }}
                    >
                        {t('melodiq.retry_connection')}
                    </Button>
                </Box>
            </Box>
        );
    }

    if (songsLength === 0 && !isOnlineSearch) {
        return (
            <Box sx={{ width: '100%', textAlign: 'center', py: 8, px: 2, opacity: 0.9, flexGrow: 1, maxWidth: 600, mx: 'auto' }}>
                <Typography variant="h5">{t('melodiq.empty_library_title', 'Deine Bibliothek ist leer')}</Typography>
                <Typography sx={{ mt: 1, mb: 3, color: 'text.secondary' }}>
                    {t('melodiq.empty_library_desc', 'Nutze das Suchfeld oder das Weltkugel-Symbol, um neue Songs online zu finden, oder öffne einen lokalen Song-Ordner.')}
                </Typography>

                {localLibrary.isSupported ? (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<FolderOpenIcon />}
                        onClick={localLibrary.selectFolder}
                        sx={{ borderRadius: 50, px: 3, py: 1 }}
                    >
                        {t('melodiq.open_local_folder', 'Lokalen Ordner öffnen')}
                    </Button>
                ) : (
                    <Alert severity="info" sx={{ textAlign: 'left' }}>
                        {t('melodiq.browser_unsupported_fs', 'Die File System Access API wird in diesem Browser nicht unterstützt. Bitte nutze Google Chrome, Microsoft Edge oder Opera für den Lite-Modus.')}
                    </Alert>
                )}
            </Box>
        );
    }

    return null;
};
