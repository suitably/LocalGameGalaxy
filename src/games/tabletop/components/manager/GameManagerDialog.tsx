import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { InstalledGamesTab } from './InstalledGamesTab';
import { EditGameDialog } from './EditGameDialog';
import { useTabletopGames } from '../../hooks/useTabletopGames';
import { saveTabletopGame, getTabletopGame, deleteTabletopGame } from '../../logic/tabletopStorage';
import { exportGameAsJson, exportGameAsPcio } from '../../logic/tabletopExporter';
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
    error,
    serverConnected,
    supportsLocalFolder,
    loadGameFromServer,
    pickLocalFolder,
    refresh,
  } = useTabletopGames();

  const [editingGame, setEditingGame] = useState<TabletopGameDefinition | null>(null);

  const fetchFullGame = async (id: string): Promise<TabletopGameDefinition | null> => {
    try {
      if (serverConnected) {
        return await loadGameFromServer(id);
      }
    } catch {
      // fallback to local IDB
    }
    return getTabletopGame(id);
  };

  const handlePlayParty = async (id: string) => {
    try {
      const full = await fetchFullGame(id);
      if (full) await saveTabletopGame(full);
    } catch {
      // ignore
    }
    onPlayParty(id);
    onClose();
  };

  const handlePlayLocal = async (id: string) => {
    try {
      const full = await fetchFullGame(id);
      if (full) await saveTabletopGame(full);
    } catch {
      // ignore
    }
    onPlayLocal(id);
    onClose();
  };

  const handleOpenLocalFolder = async () => {
    try {
      const def = await pickLocalFolder();
      await saveTabletopGame(def);
      onPlayLocal(def.id);
      onClose();
    } catch (err) {
      console.warn('[GameManagerDialog] Local folder pick cancelled or failed:', err);
    }
  };

  const handleEdit = async (id: string) => {
    const full = await fetchFullGame(id);
    if (full) setEditingGame(full);
  };

  const handleExportJson = async (id: string) => {
    const full = await fetchFullGame(id);
    if (full) exportGameAsJson(full);
  };

  const handleExportPcio = async (id: string) => {
    const full = await fetchFullGame(id);
    if (full) exportGameAsPcio(full);
  };

  const handlePublishGame = async (id: string) => {
    const full = await fetchFullGame(id);
    if (full) onPublish(full);
  };

  const handleDelete = async (id: string) => {
    await deleteTabletopGame(id);
    await refresh();
  };

  const handleSaveGame = async (saved: TabletopGameDefinition) => {
    await saveTabletopGame(saved);
    setEditingGame(null);
    await refresh();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          {t('games.tabletop.manager_title', 'Tabletop Spiele verwalten')}
        </DialogTitle>

        <DialogContent dividers sx={{ pt: 2.5 }}>
          <InstalledGamesTab
            games={games}
            loading={loading}
            error={error}
            serverConnected={serverConnected}
            supportsLocalFolder={supportsLocalFolder}
            onRefresh={refresh}
            onOpenLocalFolder={handleOpenLocalFolder}
            onPlayParty={handlePlayParty}
            onPlayLocal={handlePlayLocal}
            onEdit={handleEdit}
            onExportJson={handleExportJson}
            onExportPcio={handleExportPcio}
            onPublish={handlePublishGame}
            onDelete={handleDelete}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} variant="outlined">
            {t('common.close', 'Schließen')}
          </Button>
        </DialogActions>
      </Dialog>

      <EditGameDialog
        open={Boolean(editingGame)}
        game={editingGame}
        onClose={() => setEditingGame(null)}
        onSave={handleSaveGame}
      />
    </>
  );
};
