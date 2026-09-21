import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useTranslation } from 'react-i18next';
import { useWorkshopImport } from '../../hooks/useWorkshopImport';
import { isValidWorkshopInput } from '../../logic/steamWorkshopApi';
import { WorkshopMetaPreview } from './WorkshopMetaPreview';

interface ImportWorkshopDialogProps {
  open: boolean;
  onClose: () => void;
  onPlayGame: (gameId: string) => void;
}

export const ImportWorkshopDialog: React.FC<ImportWorkshopDialogProps> = ({
  open,
  onClose,
  onPlayGame,
}) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    status,
    meta,
    game,
    error,
    serverAvailable,
    loadMeta,
    importViaServer,
    importFromFile,
    reset,
  } = useWorkshopImport();

  const handleClose = () => {
    reset();
    setUrl('');
    onClose();
  };

  const handleLoadMeta = () => {
    if (isValidWorkshopInput(url)) {
      loadMeta(url);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importFromFile(file);
  };

  const isLoading = status === 'loading_meta' || status === 'downloading' || status === 'parsing';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t('games.tabletop.import_workshop', 'Steam Workshop importieren')}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>
          {/* URL Input */}
          <TextField
            fullWidth
            label={t('games.tabletop.workshop_url_label', 'Steam Workshop URL')}
            placeholder="https://steamcommunity.com/sharedfiles/filedetails/?id=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLoadMeta();
            }}
            disabled={isLoading || status === 'success'}
            size="small"
          />

          {/* Search Button */}
          {status === 'idle' || status === 'error' ? (
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                onClick={handleLoadMeta}
                disabled={!isValidWorkshopInput(url) || !serverAvailable}
                startIcon={<CloudDownloadIcon />}
              >
                {t('games.tabletop.workshop_load_info', 'Mod-Info laden')}
              </Button>
              <Button
                variant="outlined"
                onClick={() => fileInputRef.current?.click()}
                startIcon={<UploadFileIcon />}
              >
                {t('games.tabletop.workshop_upload_manual', 'JSON hochladen')}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </Box>
          ) : null}

          {!serverAvailable && status !== 'success' && (
            <Alert severity="info">
              {t(
                'games.tabletop.workshop_no_server',
                'Kein Server verbunden — du kannst TTS-JSON-Dateien manuell hochladen.',
              )}
            </Alert>
          )}

          {/* Loading States */}
          {status === 'loading_meta' && (
            <Box display="flex" alignItems="center" gap={1.5}>
              <CircularProgress size={20} />
              <Typography variant="body2">
                {t('games.tabletop.workshop_loading_meta', 'Lade Mod-Informationen...')}
              </Typography>
            </Box>
          )}

          {status === 'downloading' && (
            <Box display="flex" alignItems="center" gap={1.5}>
              <CircularProgress size={20} />
              <Typography variant="body2">
                {t('games.tabletop.workshop_downloading', 'Mod wird heruntergeladen...')}
              </Typography>
            </Box>
          )}

          {status === 'parsing' && (
            <Box display="flex" alignItems="center" gap={1.5}>
              <CircularProgress size={20} />
              <Typography variant="body2">
                {t('games.tabletop.workshop_parsing', 'Spiel wird konvertiert...')}
              </Typography>
            </Box>
          )}

          {/* Error */}
          {error && <Alert severity="error">{error}</Alert>}

          {/* Meta Preview */}
          {meta && (status === 'meta_loaded' || status === 'downloading' || status === 'parsing') && (
            <WorkshopMetaPreview meta={meta} />
          )}

          {/* Import Button */}
          {status === 'meta_loaded' && meta?.fileUrl && (
            <Button
              variant="contained"
              color="primary"
              onClick={importViaServer}
              startIcon={<CloudDownloadIcon />}
              fullWidth
            >
              {t('games.tabletop.workshop_import_via_server', 'Importieren & lokal speichern')}
            </Button>
          )}

          {status === 'meta_loaded' && !meta?.fileUrl && (
            <Alert severity="warning">
              {t(
                'games.tabletop.workshop_no_file_url',
                'Steam hat keine direkte Download-URL. Bitte lade die JSON-Datei manuell hoch.',
              )}
            </Alert>
          )}

          {/* Success */}
          {status === 'success' && game && (
            <Alert
              severity="success"
              action={
                <Button
                  color="inherit"
                  size="small"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => {
                    onPlayGame(game.id);
                    handleClose();
                  }}
                >
                  {t('games.tabletop.workshop_play_now', 'Jetzt spielen')}
                </Button>
              }
            >
              {t('games.tabletop.workshop_success', '„{{name}}" erfolgreich importiert!', {
                name: game.name,
              })}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} variant="outlined">
          {t('common.close', 'Schließen')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
