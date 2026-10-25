import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Typography,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Tooltip,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/FolderRounded';
import AddIcon from '@mui/icons-material/AddRounded';
import DeleteIcon from '@mui/icons-material/DeleteRounded';
import DownloadIcon from '@mui/icons-material/DownloadRounded';
import EditIcon from '@mui/icons-material/EditRounded';
import { settingsCardSx } from '../../features/settings/settingsStyles';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ListSkeleton } from '../common/ListSkeleton';
import { SettingsCardHeader } from './SettingsCardHeader';
import { ServerDirectoryBrowser } from './ServerDirectoryBrowser';
import { useServerDirectories } from './useServerDirectories';

export const ServerDirectoryManager: React.FC = () => {
  const { t } = useTranslation();
  const {
    isServerActive,
    directories,
    downloadDir,
    loading,
    error,
    addDirectory,
    removeDirectory,
    setDownloadDirectory,
  } = useServerDirectories();
  const [browserMode, setBrowserMode] = useState<'library' | 'download' | null>(null);
  const [dirToDelete, setDirToDelete] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!dirToDelete) return;
    const path = dirToDelete;
    setDirToDelete(null);
    await removeDirectory(path);
  };

  if (!isServerActive) {
    return null;
  }

  return (
    <Paper sx={settingsCardSx}>
      <SettingsCardHeader
        title={t('server.directories.title', 'Library Directories')}
        description={t('server.directories.desc', 'Manage scanned server directories for songs.')}
        action={
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setBrowserMode('library')}
          >
            {t('server.directories.add_btn', 'Add Directory')}
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ my: 1.5 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <ListSkeleton rows={2} />
      ) : (
        <List dense sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 0.5, mb: 3 }}>
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
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
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
          <Typography
            variant="body2"
            sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', p: 1, borderRadius: 2 }}
          >
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
        title={
          browserMode === 'download'
            ? t('server.directories.download_dir_title', 'Download Directory')
            : t('server.directories.add_btn', 'Add Directory')
        }
        onClose={() => setBrowserMode(null)}
        onSelect={(selectedPath) => {
          if (browserMode === 'library') {
            addDirectory(selectedPath);
          } else if (browserMode === 'download') {
            setDownloadDirectory(selectedPath);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(dirToDelete)}
        title={t('server.directories.confirm_remove_title', 'Remove Directory')}
        message={t('server.directories.confirm_remove_message', {
          path: dirToDelete || '',
          defaultValue: `Remove directory ${dirToDelete}?`,
        })}
        confirmColor="error"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDirToDelete(null)}
      />
    </Paper>
  );
};
