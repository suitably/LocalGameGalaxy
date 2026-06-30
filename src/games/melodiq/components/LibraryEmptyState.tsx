import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface LibraryEmptyStateProps {
    hasConnectionError: boolean;
    isLoading: boolean;
    songsLength: number;
    isOnlineSearch: boolean;
    refreshSongs: () => void;
}

export const LibraryEmptyState: React.FC<LibraryEmptyStateProps> = ({
    hasConnectionError, isLoading, songsLength, isOnlineSearch, refreshSongs
}) => {
    const { t } = useTranslation();

    if (hasConnectionError) {
        return (
            <Box sx={{ width: '100%', textAlign: 'center', py: 8, opacity: 0.7, flexGrow: 1 }}>
                <Typography variant="h5">{t('melodiq.cannot_connect')}</Typography>
                <Typography sx={{ mt: 1 }}>
                    {t('melodiq.helper_required')}
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button
                        variant="contained"
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
                        sx={{
                            borderRadius: 50,
                            px: 4,
                            py: 1.5,
                            backgroundImage: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                            boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                            color: 'white'
                        }}
                    >
                        {t('melodiq.download_helper')}
                    </Button>
                    <Button
                        onClick={refreshSongs}
                        variant="outlined"
                        sx={{
                            borderRadius: 50,
                            px: 4,
                            py: 1.5
                        }}
                    >
                        {t('melodiq.retry_connection')}
                    </Button>
                </Box>
            </Box>
        );
    }

    if (songsLength === 0 && !isOnlineSearch) {
        return (
            <Box sx={{ width: '100%', textAlign: 'center', py: 8, opacity: 0.7, flexGrow: 1 }}>
                <Typography variant="h5">Deine Bibliothek ist leer</Typography>
                <Typography sx={{ mt: 1 }}>
                    Nutze das Suchfeld oder das Weltkugel-Symbol, um neue Songs online zu finden und herunterzuladen.
                </Typography>
            </Box>
        );
    }

    return null;
};
