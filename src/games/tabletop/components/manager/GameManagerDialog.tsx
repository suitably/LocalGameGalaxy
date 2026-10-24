import React, { useState } from 'react';
import { Alert, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { InstalledGamesTab } from './InstalledGamesTab';
import { LocalGamesSection } from './LocalGamesSection';
import { EditGameDialog } from './EditGameDialog';
import { ImportWorkshopDialog } from './ImportWorkshopDialog';
import { useGameManager, type GameSource, type ManagerNotice } from '../../hooks/useGameManager';
import { saveTabletopGame } from '../../logic/tabletopStorage';
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
  const manager = useGameManager(open);
  const { server } = manager;
  const [workshopOpen, setWorkshopOpen] = useState(false);

  const noticeText = (n: ManagerNotice) =>
    n.kind === 'error'
      ? t('games.tabletop.server_save_failed', { error: n.error })
      : t(`games.tabletop.server_${n.kind}`, { name: n.name });

  /** The card actions, bound to where the listed games live. */
  const handlersFor = (source: GameSource) => {
    const withFull = (use: (game: TabletopGameDefinition) => void) => async (id: string) => {
      const full = await manager.fetchFull(id, source);
      if (full) use(full);
    };
    return {
      onPlayParty: async (id: string) => {
        await manager.prepareToPlay(id, source);
        onPlayParty(id);
        onClose();
      },
      onPlayLocal: async (id: string) => {
        await manager.prepareToPlay(id, source);
        onPlayLocal(id);
        onClose();
      },
      onEdit: (id: string) => void manager.startEdit(id, source),
      onExportJson: withFull(exportGameAsJson),
      onExportPcio: withFull(exportGameAsPcio),
      onPublish: withFull(onPublish),
      onDelete: (id: string) => void manager.remove(id, source),
    };
  };

  const handleOpenLocalFolder = async () => {
    try {
      const def = await server.pickLocalFolder();
      await saveTabletopGame(def);
      onPlayLocal(def.id);
      onClose();
    } catch (err) {
      console.warn('[GameManagerDialog] Local folder pick cancelled or failed:', err);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          {t('games.tabletop.manager_title', 'Tabletop Spiele verwalten')}
        </DialogTitle>

        <DialogContent dividers sx={{ pt: 2.5 }}>
          {manager.notice && (
            <Alert
              severity={manager.notice.kind === 'error' ? 'error' : 'success'}
              onClose={manager.clearNotice}
              sx={{ mb: 2 }}
            >
              {noticeText(manager.notice)}
            </Alert>
          )}
          <InstalledGamesTab
            games={server.games}
            loading={server.loading}
            error={server.error}
            serverConnected={server.serverConnected}
            supportsLocalFolder={server.supportsLocalFolder}
            onRefresh={server.refresh}
            onOpenLocalFolder={handleOpenLocalFolder}
            onImportWorkshop={() => setWorkshopOpen(true)}
            busyId={manager.busyId}
            {...handlersFor('server')}
          />
          <LocalGamesSection
            games={manager.localGames}
            serverConnected={server.serverConnected}
            busyId={manager.busyId}
            onSaveToServer={(id) => void manager.saveToServer(id)}
            {...handlersFor('local')}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} variant="outlined">
            {t('common.close', 'Schließen')}
          </Button>
        </DialogActions>
      </Dialog>

      <EditGameDialog
        open={Boolean(manager.editing)}
        game={manager.editing}
        onClose={manager.cancelEdit}
        onSave={manager.saveEdit}
      />

      <ImportWorkshopDialog
        open={workshopOpen}
        onClose={() => {
          setWorkshopOpen(false);
          void server.refresh();
          manager.reloadLocal();
        }}
        onPlayGame={(id) => {
          onPlayLocal(id);
          onClose();
        }}
      />
    </>
  );
};
