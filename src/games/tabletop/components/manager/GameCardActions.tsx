import React, { useState } from 'react';
import { Box, IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/EditRounded';
import FileDownloadIcon from '@mui/icons-material/FileDownloadRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineRounded';
import PublishIcon from '@mui/icons-material/PublishRounded';
import CloudUploadIcon from '@mui/icons-material/CloudUploadRounded';
import { useTranslation } from 'react-i18next';
import type { TabletopGameSummary } from '../../logic/types';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';

export interface GameCardActionsProps {
  game: TabletopGameSummary;
  onEdit: (id: string) => void;
  onExportJson: (id: string) => void;
  onExportPcio: (id: string) => void;
  onPublish: (id: string) => void;
  onDelete: (id: string) => void;
  /** Games on this device: copy into the companion server's library. */
  onSaveToServer?: (id: string) => void;
  /** A server action for this game is running. */
  busy?: boolean;
  /** Read-only server games cannot be deleted from the app. */
  canDelete?: boolean;
}

/** Edit, export, publish, save-to-server and delete for one game card. */
export const GameCardActions: React.FC<GameCardActionsProps> = ({
  game,
  onEdit,
  onExportJson,
  onExportPcio,
  onPublish,
  onDelete,
  onSaveToServer,
  busy = false,
  canDelete = true,
}) => {
  const { t } = useTranslation();
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  return (
    <>
      <Box display="flex" gap={0.5}>
        <Tooltip title={t('common.edit', 'Bearbeiten')}>
          <IconButton size="small" onClick={() => onEdit(game.id)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('games.tabletop.export', 'Exportieren')}>
          <IconButton size="small" onClick={(e) => setExportAnchor(e.currentTarget)}>
            <FileDownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={exportAnchor}
          open={Boolean(exportAnchor)}
          onClose={() => setExportAnchor(null)}
        >
          <MenuItem
            onClick={() => {
              setExportAnchor(null);
              onExportPcio(game.id);
            }}
          >
            {t('games.tabletop.export_pcio', 'Als .pcio (ZIP) exportieren')}
          </MenuItem>
          <MenuItem
            onClick={() => {
              setExportAnchor(null);
              onExportJson(game.id);
            }}
          >
            {t('games.tabletop.export_json', 'Als .json exportieren')}
          </MenuItem>
        </Menu>
        <Tooltip title={t('games.tabletop.publish', 'Als PR einreichen')}>
          <IconButton size="small" color="primary" onClick={() => onPublish(game.id)}>
            <PublishIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {onSaveToServer && (
          <Tooltip title={t('games.tabletop.save_to_server')}>
            <span>
              <IconButton
                size="small"
                color="primary"
                disabled={busy}
                onClick={() => onSaveToServer(game.id)}
              >
                <CloudUploadIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {canDelete && (
          <Tooltip title={t('common.delete', 'Löschen')}>
            <span>
              <IconButton
                size="small"
                color="error"
                disabled={busy}
                onClick={() => setDeleteConfirmOpen(true)}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>
      <ConfirmDialog
        open={deleteConfirmOpen}
        title={t('games.tabletop.confirm_delete_title', 'Spiel löschen?')}
        message={t(
          'games.tabletop.confirm_delete_message',
          'Möchtest du "{{name}}" wirklich unwiderruflich aus deinem Speicher löschen?',
          { name: game.name },
        )}
        confirmText={t('common.delete', 'Löschen')}
        confirmColor="error"
        onConfirm={() => {
          setDeleteConfirmOpen(false);
          onDelete(game.id);
        }}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </>
  );
};
