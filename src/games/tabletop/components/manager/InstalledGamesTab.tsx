import React, { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  Alert,
  Button,
  Paper,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useTranslation } from 'react-i18next';
import { GameDropZone } from './GameDropZone';
import { GameCardItem } from './GameCardItem';
import type { TabletopGameSummary } from '../../logic/types';

interface InstalledGamesTabProps {
  games: TabletopGameSummary[];
  loading: boolean;
  importError: string | null;
  onFileSelect: (file: File) => Promise<unknown>;
  onInstallStarterPack: () => Promise<unknown>;
  onPlayParty: (id: string) => void;
  onPlayLocal: (id: string) => void;
  onEdit: (id: string) => void;
  onExportJson: (id: string) => void;
  onExportPcio: (id: string) => void;
  onPublish: (id: string) => void;
  onDelete: (id: string) => void;
}

export const InstalledGamesTab: React.FC<InstalledGamesTabProps> = ({
  games,
  loading,
  importError,
  onFileSelect,
  onInstallStarterPack,
  onPlayParty,
  onPlayLocal,
  onEdit,
  onExportJson,
  onExportPcio,
  onPublish,
  onDelete,
}) => {
  const { t } = useTranslation();
  const [isImporting, setIsImporting] = useState(false);
  const [isInstallingStarter, setIsInstallingStarter] = useState(false);
  const [starterSuccess, setStarterSuccess] = useState(false);

  const handleFile = async (file: File) => {
    setIsImporting(true);
    try {
      await onFileSelect(file);
    } finally {
      setIsImporting(false);
    }
  };

  const handleInstallStarter = async () => {
    setIsInstallingStarter(true);
    setStarterSuccess(false);
    try {
      await onInstallStarterPack();
      setStarterSuccess(true);
    } finally {
      setIsInstallingStarter(false);
    }
  };

  return (
    <Stack spacing={3}>
      <GameDropZone onFileSelect={handleFile} isImporting={isImporting} />

      {importError && (
        <Alert severity="error" onClose={() => {}}>
          {importError}
        </Alert>
      )}

      {starterSuccess && (
        <Alert severity="success" onClose={() => setStarterSuccess(false)}>
          {t('games.tabletop.install_starter_pack_success', 'Starter-Paket erfolgreich installiert!')}
        </Alert>
      )}

      {games.length === 0 && !loading && (
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: 3,
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {t('games.tabletop.install_starter_pack', 'Starter-Paket installieren')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t(
                'games.tabletop.install_starter_pack_desc',
                'Installiert sofort Standard-Kartendeck, Dame und Liar\'s Dice in deine Bibliothek.',
              )}
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={isInstallingStarter ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
            onClick={handleInstallStarter}
            disabled={isInstallingStarter}
          >
            {t('games.tabletop.install', 'Installieren')}
          </Button>
        </Paper>
      )}

      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Typography variant="subtitle1" fontWeight={700}>
            {t('games.tabletop.my_games', 'Installierte Spiele')} ({games.length})
          </Typography>
          {games.length > 0 && (
            <Button
              size="small"
              variant="text"
              startIcon={isInstallingStarter ? <CircularProgress size={14} /> : <AutoAwesomeIcon />}
              onClick={handleInstallStarter}
              disabled={isInstallingStarter}
            >
              {t('games.tabletop.install_starter_pack', 'Starter-Paket')}
            </Button>
          )}
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={32} />
          </Box>
        ) : games.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
            {t(
              'games.tabletop.no_games',
              'Noch keine eigenen Spiele importiert. Ziehe eine .pcio- oder .json-Datei in das Feld oben!',
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
                onEdit={onEdit}
                onExportJson={onExportJson}
                onExportPcio={onExportPcio}
                onPublish={onPublish}
                onDelete={onDelete}
              />
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
};
