import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { useTranslation } from 'react-i18next';
import { InstalledGamesTab } from './InstalledGamesTab';
import { TemplatesCatalogTab } from './TemplatesCatalogTab';
import { UrlImportTab } from './UrlImportTab';
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
    importFromUrl,
    installStarterPack,
    installCatalogGame,
    saveGame,
    removeGame,
    loadGame,
    exportGameAsJson,
    exportGameAsPcio,
  } = useTabletopGames();

  const [activeTab, setActiveTab] = useState(0);
  const [editingGame, setEditingGame] = useState<TabletopGameDefinition | null>(null);

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

  const handleInstallTemplate = async (filePath: string) => {
    await installCatalogGame(filePath);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 0 }}>
          {t('games.tabletop.manager_title', 'Tabletop Spiele verwalten')}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 1.5 }}>
            <Tabs
              value={activeTab}
              onChange={(_, val) => setActiveTab(val)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab
                icon={<Badge badgeContent={games.length} color="primary"><StorageIcon /></Badge>}
                iconPosition="start"
                label={t('games.tabletop.tab_my_games', 'Meine Spiele')}
              />
              <Tab
                icon={<AutoAwesomeIcon />}
                iconPosition="start"
                label={t('games.tabletop.tab_catalog', 'Katalog & Vorlagen')}
              />
              <Tab
                icon={<CloudDownloadIcon />}
                iconPosition="start"
                label={t('games.tabletop.tab_url_import', 'Aus dem Web / URL')}
              />
            </Tabs>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ pt: 2.5 }}>
          {activeTab === 0 && (
            <InstalledGamesTab
              games={games}
              loading={loading}
              importError={importError}
              onFileSelect={importFile}
              onInstallStarterPack={installStarterPack}
              onPlayParty={onPlayParty}
              onPlayLocal={onPlayLocal}
              onEdit={handleEdit}
              onExportJson={handleExportJson}
              onExportPcio={handleExportPcio}
              onPublish={handlePublish}
              onDelete={removeGame}
            />
          )}

          {activeTab === 1 && (
            <TemplatesCatalogTab
              installedGames={games}
              onInstallTemplate={handleInstallTemplate}
            />
          )}

          {activeTab === 2 && (
            <UrlImportTab onImportFromUrl={importFromUrl} />
          )}
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
        onSave={saveGame}
      />
    </>
  );
};
