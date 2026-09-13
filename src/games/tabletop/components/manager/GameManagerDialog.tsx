import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { GameDropZone } from './GameDropZone';
import { GameCardItem } from './GameCardItem';
import { EditGameDialog } from './EditGameDialog';
import { useTabletopGames } from '../../hooks/useTabletopGames';
import type { TabletopGameDefinition } from '../../logic/types';

interface GameManagerDialogProps {
  open: boolean;
  onClose: () => void;
  onPlayParty: (id: string) => void;
  onPlayLocal: (id: string) => void;
  onPublish: (game: TabletopGameDefinition) => void;
}

export const GameManagerDialog: React.FC<GameManagerDialogProps> = ({
  open,
  onClose,
  onPlayParty,
  onPlayLocal,
  onPublish,
}) => {
  const { t } = useTranslation();
  const {
    games,
    loading,
    importError,
    importFile,
    saveGame,
    removeGame,
    loadGame,
    exportGameAsJson,
    exportGameAsPcio,
  } = useTabletopGames();

  const [editingGame, setEditingGame] = useState<TabletopGameDefinition | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileSelect = async (file: File) => {
    setIsImporting(true);
    try {
      await importFile(file);
    } finally {
      setIsImporting(false);
    }
  };

  const handleEdit = async (id: string) => {
    const full = await loadGame(id);
    if (full) setEditingGame(full);
  };

  const handleExportJson = async (id: string) => {
    const full = await loadGame(id);
    if (full) exportGameAsJson(full);
  };

  const handleExportPcio = async (id: string) => {
    const full = await loadGame(id);
    if (full) exportGameAsPcio(full);
  };

  const handlePublish = async (id: string) => {
    const full = await loadGame(id);
    if (full) onPublish(full);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>{t('games.tabletop.manager_title', 'Tabletop Spiele verwalten')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <GameDropZone onFileSelect={handleFileSelect} isImporting={isImporting} />

            {importError && (
              <Alert severity="error" onClose={() => {}}>
                {importError}
              </Alert>
            )}

            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                {t('games.tabletop.my_games', 'Installierte Spiele')} ({games.length})
              </Typography>

              {loading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress size={32} />
                </Box>
              ) : games.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                  {t('games.tabletop.no_games', 'Noch keine eigenen Spiele importiert. Ziehe eine .pcio- oder .json-Datei in das Feld oben!')}
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {games.map((g) => (
                    <GameCardItem
                      key={g.id}
                      game={g}
                      onPlayParty={onPlayParty}
                      onPlayLocal={onPlayLocal}
                      onEdit={handleEdit}
                      onExportJson={handleExportJson}
                      onExportPcio={handleExportPcio}
                      onPublish={handlePublish}
                      onDelete={removeGame}
                    />
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="outlined">{t('common.close', 'Schließen')}</Button>
        </DialogActions>
      </Dialog>

      <EditGameDialog
        open={Boolean(editingGame)}
        game={editingGame}
        onClose={() => setEditingGame(null)}
        onSave={saveGame}
      />
    </>
  );
};
