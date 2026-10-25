import React from 'react';
import { alpha, Box, Typography, Button, Alert } from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpenRounded';
import LockOpenIcon from '@mui/icons-material/LockOpenRounded';
import { useTranslation } from 'react-i18next';
import { useSongs } from '../hooks/useSongs';

interface LibraryEmptyStateProps {
  hasConnectionError: boolean;
  isLoading: boolean;
  songsLength: number;
  isOnlineSearch: boolean;
  refreshSongs: () => void;
  isClient?: boolean;
}

const EmptyPanel: React.FC<{ wide?: boolean; children: React.ReactNode }> = ({
  wide = false,
  children,
}) => (
  <Box
    sx={{
      width: '100%',
      textAlign: 'center',
      py: wide ? 6 : 8,
      px: 2,
      opacity: 0.9,
      flexGrow: 1,
      maxWidth: wide ? 650 : 600,
      mx: 'auto',
    }}
  >
    {children}
  </Box>
);

const RetryButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const { t } = useTranslation();
  return (
    <Button onClick={onClick} variant="outlined" sx={{ borderRadius: 999, px: 3, py: 1 }}>
      {t('melodiq.retry_connection', 'Erneut versuchen')}
    </Button>
  );
};

export const LibraryEmptyState: React.FC<LibraryEmptyStateProps> = ({
  hasConnectionError,
  songsLength,
  isOnlineSearch,
  refreshSongs,
  isClient,
}) => {
  const { t } = useTranslation();
  const { localLibrary } = useSongs();

  if (isClient) {
    if (hasConnectionError) {
      return (
        <EmptyPanel wide={true}>
          <Typography variant="h5">
            {t('melodiq.client_connection_error', 'Konnte keine Songs vom Host laden')}
          </Typography>
          <Typography sx={{ mt: 1, mb: 3, color: 'text.secondary' }}>
            {t(
              'melodiq.client_connection_error_desc',
              'Bitte stelle sicher, dass der Host verbunden ist und Songs bereitstellt.',
            )}
          </Typography>
          <RetryButton onClick={refreshSongs} />
        </EmptyPanel>
      );
    }

    if (songsLength === 0 && !isOnlineSearch) {
      return (
        <EmptyPanel wide={false}>
          <Typography variant="h5">
            {t('melodiq.client_empty_library_title', 'Keine Songs vom Host verfügbar')}
          </Typography>
          <Typography sx={{ mt: 1, mb: 3, color: 'text.secondary' }}>
            {t(
              'melodiq.client_empty_library_desc',
              'Der Host hat momentan keine Songs in der Bibliothek geladen.',
            )}
          </Typography>
          <RetryButton onClick={refreshSongs} />
        </EmptyPanel>
      );
    }
    return null;
  }

  if (hasConnectionError) {
    return (
      <EmptyPanel wide={true}>
        <Typography variant="h5">{t('melodiq.cannot_connect')}</Typography>
        <Typography sx={{ mt: 1, mb: 3, color: 'text.secondary' }}>
          {t('melodiq.helper_required')}
        </Typography>

        {localLibrary.isSupported ? (
          <Box
            sx={{
              mb: 4,
              p: 2.5,
              bgcolor: (theme) => alpha(theme.palette.text.primary, 0.05),
              borderRadius: 2,
              border: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
              {t('melodiq.lite_mode', 'Lite-Modus (Serverlos)')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t(
                'melodiq.local_folder_desc',
                'Lade UltraStar-Songs direkt aus einem lokalen Ordner auf deiner Festplatte – komplett ohne Server.',
              )}
            </Typography>

            {localLibrary.hasFolder && localLibrary.permissionStatus === 'prompt' ? (
              <Button
                variant="contained"
                color="warning"
                startIcon={<LockOpenIcon />}
                onClick={localLibrary.requestFolderPermission}
                sx={{ borderRadius: 999, px: 3, py: 1 }}
              >
                {t('melodiq.grant_folder_permission', 'Zugriff auf {{name}} erlauben', {
                  name: localLibrary.folderName,
                })}
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                startIcon={<FolderOpenIcon />}
                onClick={localLibrary.selectFolder}
                sx={{ borderRadius: 999, px: 3, py: 1 }}
              >
                {t('melodiq.open_local_folder', 'Lokalen Ordner öffnen')}
              </Button>
            )}
          </Box>
        ) : (
          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            {t(
              'melodiq.browser_unsupported_fs',
              'Die File System Access API wird in diesem Browser nicht unterstützt. Bitte nutze Google Chrome, Microsoft Edge oder Opera für den Lite-Modus.',
            )}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => {
              let filename = 'nexumia-server-win.zip';
              if (navigator.userAgent.includes('Mac')) {
                filename = 'nexumia-server-macos.tar.gz';
              } else if (
                navigator.userAgent.includes('Linux') &&
                !navigator.userAgent.includes('Android')
              ) {
                filename = 'nexumia-server-linux.tar.gz';
              }
              window.location.href = `https://github.com/suitably/LocalGameGalaxy/releases/latest/download/${filename}`;
            }}
            sx={{ borderRadius: 999, px: 3, py: 1 }}
          >
            {t('melodiq.download_helper')}
          </Button>
          <RetryButton onClick={refreshSongs} />
        </Box>
      </EmptyPanel>
    );
  }

  if (songsLength === 0 && !isOnlineSearch) {
    return (
      <EmptyPanel wide={false}>
        <Typography variant="h5">
          {t('melodiq.empty_library_title', 'Deine Bibliothek ist leer')}
        </Typography>
        <Typography sx={{ mt: 1, mb: 3, color: 'text.secondary' }}>
          {t(
            'melodiq.empty_library_desc',
            'Nutze das Suchfeld oder das Weltkugel-Symbol, um neue Songs online zu finden, oder öffne einen lokalen Song-Ordner.',
          )}
        </Typography>

        {localLibrary.isSupported ? (
          <Button
            variant="contained"
            color="primary"
            startIcon={<FolderOpenIcon />}
            onClick={localLibrary.selectFolder}
            sx={{ borderRadius: 999, px: 3, py: 1 }}
          >
            {t('melodiq.open_local_folder', 'Lokalen Ordner öffnen')}
          </Button>
        ) : (
          <Alert severity="info" sx={{ textAlign: 'left' }}>
            {t(
              'melodiq.browser_unsupported_fs',
              'Die File System Access API wird in diesem Browser nicht unterstützt. Bitte nutze Google Chrome, Microsoft Edge oder Opera für den Lite-Modus.',
            )}
          </Alert>
        )}
      </EmptyPanel>
    );
  }

  return null;
};
