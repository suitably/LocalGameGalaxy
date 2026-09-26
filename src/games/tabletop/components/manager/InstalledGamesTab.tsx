import React from 'react';
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  Alert,
  Button,
  Paper,
  Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import SettingsIcon from '@mui/icons-material/Settings';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { GameCardItem } from './GameCardItem';
import type { TabletopGameSummary } from '../../logic/types';

interface InstalledGamesTabProps {
  games: TabletopGameSummary[];
  loading: boolean;
  error: string | null;
  serverConnected: boolean;
  supportsLocalFolder: boolean;
  onRefresh: () => void | Promise<void>;
  onOpenLocalFolder?: () => void | Promise<void>;
  onImportWorkshop?: () => void;
  onPlayParty: (id: string) => void;
  onPlayLocal: (id: string) => void;
  onEdit?: (id: string) => void;
  onExportJson?: (id: string) => void;
  onExportPcio?: (id: string) => void;
  onPublish?: (id: string) => void;
  onDelete?: (id: string) => void;
  onOpenSettings?: () => void;
}

export const InstalledGamesTab: React.FC<InstalledGamesTabProps> = ({
  games,
  loading,
  error,
  serverConnected,
  supportsLocalFolder,
  onRefresh,
  onOpenLocalFolder,
  onImportWorkshop,
  onPlayParty,
  onPlayLocal,
  onEdit,
  onExportJson,
  onExportPcio,
  onPublish,
  onDelete,
  onOpenSettings,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleOpenSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      navigate('/settings?tab=server');
    }
  };

  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="flex-end" alignItems="center" gap={1} flexWrap="wrap">
        <Button
          variant="outlined"
          startIcon={<CloudDownloadIcon />}
          onClick={onImportWorkshop}
        >
          {t('games.tabletop.import_workshop', 'Steam Workshop importieren')}
        </Button>
        {supportsLocalFolder ? (
          <Button
            variant="outlined"
            startIcon={<FolderOpenIcon />}
            onClick={onOpenLocalFolder}
          >
            {t('games.tabletop.open_local_folder', 'Lokalen Spielordner öffnen')}
          </Button>
        ) : (
          <Tooltip
            title={t(
              'games.tabletop.local_folder_not_supported',
              'Dein Browser unterstützt keinen lokalen Ordner-Zugriff',
            )}
          >
            <span>
              <Button variant="outlined" disabled startIcon={<FolderOpenIcon />}>
                {t('games.tabletop.open_local_folder', 'Lokalen Spielordner öffnen')}
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {!serverConnected ? (
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            borderRadius: 3,
            bgcolor: 'action.hover',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 2,
          }}
        >
          <CloudOffIcon color="action" sx={{ fontSize: 40 }} />
          <Typography variant="body1" fontWeight={500}>
            {t(
              'games.tabletop.server_required',
              'Verbinde den Tabletop-Companion-Server in den Einstellungen',
            )}
          </Typography>
          <Button
            variant="contained"
            startIcon={<SettingsIcon />}
            onClick={handleOpenSettings}
          >
            {t('games.tabletop.open_settings', 'Einstellungen öffnen')}
          </Button>
        </Paper>
      ) : (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1" fontWeight={700}>
              {t('games.tabletop.server_games_title', 'Verfügbare Spiele ({{count}})', {
                count: games.length,
              })}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon />}
              onClick={onRefresh}
              disabled={loading}
            >
              {t('games.tabletop.refresh', 'Neu scannen')}
            </Button>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={32} />
            </Box>
          ) : games.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
              {t(
                'games.tabletop.no_games',
                'Noch keine Spiele im Server-Verzeichnis gefunden.',
              )}
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {games.map((g) => (
                <GameCardItem
                  key={g.id}
                  game={g}
                  onPlayParty={onPlayParty}
                  onPlayLocal={onPlayLocal}
                  onEdit={onEdit ?? (() => {})}
                  onExportJson={onExportJson ?? (() => {})}
                  onExportPcio={onExportPcio ?? (() => {})}
                  onPublish={onPublish ?? (() => {})}
                  onDelete={onDelete ?? (() => {})}
                />
              ))}
            </Stack>
          )}
        </Box>
      )}
    </Stack>
  );
};
