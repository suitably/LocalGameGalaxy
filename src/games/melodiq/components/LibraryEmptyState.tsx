import React from 'react';
import { alpha, Box, Typography, Button, Alert } from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpenRounded';
import LockOpenIcon from '@mui/icons-material/LockOpenRounded';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSongs } from '../hooks/useSongs';
import { settingsPath } from '../../../features/settings/settingsRoutes';

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
      {t('melodiq.retry_connection')}
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
  const navigate = useNavigate();
  const location = useLocation();

  if (isClient) {
    if (hasConnectionError) {
      return (
        <EmptyPanel wide={true}>
          <Typography variant="h5">{t('melodiq.client_connection_error')}</Typography>
          <Typography sx={{ mt: 1, mb: 3, color: 'text.secondary' }}>
            {t('games.melodiq.client_connection_error_desc')}
          </Typography>
          <RetryButton onClick={refreshSongs} />
        </EmptyPanel>
      );
    }

    if (songsLength === 0 && !isOnlineSearch) {
      return (
        <EmptyPanel wide={false}>
          <Typography variant="h5">{t('melodiq.client_empty_library_title')}</Typography>
          <Typography sx={{ mt: 1, mb: 3, color: 'text.secondary' }}>
            {t('games.melodiq.client_empty_library_desc')}
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
              {t('melodiq.lite_mode')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('games.melodiq.local_folder_desc')}
            </Typography>

            {localLibrary.hasFolder && localLibrary.permissionStatus === 'prompt' ? (
              <Button
                variant="contained"
                color="warning"
                startIcon={<LockOpenIcon />}
                onClick={localLibrary.requestFolderPermission}
                sx={{ borderRadius: 999, px: 3, py: 1 }}
              >
                {t('melodiq.grant_folder_permission', {
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
                {t('melodiq.open_local_folder')}
              </Button>
            )}
          </Box>
        ) : (
          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            {t('games.melodiq.browser_unsupported_fs')}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() =>
              // Settings → Server opens the setup wizard (OS download + auto-pairing).
              navigate(settingsPath({ kind: 'app', section: 'connectivity', highlight: 'setup' }), {
                state: { from: location.pathname + location.search },
              })
            }
            sx={{ borderRadius: 999, px: 3, py: 1 }}
          >
            {t('melodiq.setup_server')}
          </Button>
          <RetryButton onClick={refreshSongs} />
        </Box>
      </EmptyPanel>
    );
  }

  if (songsLength === 0 && !isOnlineSearch) {
    return (
      <EmptyPanel wide={false}>
        <Typography variant="h5">{t('melodiq.empty_library_title')}</Typography>
        <Typography sx={{ mt: 1, mb: 3, color: 'text.secondary' }}>
          {t('games.melodiq.empty_library_desc')}
        </Typography>

        {localLibrary.isSupported ? (
          <Button
            variant="contained"
            color="primary"
            startIcon={<FolderOpenIcon />}
            onClick={localLibrary.selectFolder}
            sx={{ borderRadius: 999, px: 3, py: 1 }}
          >
            {t('melodiq.open_local_folder')}
          </Button>
        ) : (
          <Alert severity="info" sx={{ textAlign: 'left' }}>
            {t('games.melodiq.browser_unsupported_fs')}
          </Alert>
        )}
      </EmptyPanel>
    );
  }

  return null;
};
