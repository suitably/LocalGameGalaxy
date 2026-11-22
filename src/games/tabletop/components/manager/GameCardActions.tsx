import React, { useState } from 'react';
import { Box, IconButton, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineRounded';
import ShareIcon from '@mui/icons-material/ShareRounded';
import { useTranslation } from 'react-i18next';
import type { TabletopGameSummary } from '../../logic/types';
import { isThirdPartySummary } from '../../logic/shareRules';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';

export interface GameCardActionsProps {
  game: TabletopGameSummary;
  onEdit: (id: string) => void;
  onExportJson: (id: string) => void;
  onExportPcio: (id: string) => void;
  onDelete: (id: string) => void;
  /** Games on this device: copy into the companion server's library. */
  onSaveToServer?: (id: string) => void;
  /** A server action for this game is running. */
  busy?: boolean;
  /** Read-only server games cannot be deleted from the app. */
  canDelete?: boolean;
}

/**
 * Edit, share and delete for one game card. Sharing is the file export (.pcio / .json) and, with
 * a companion server, saving to its library; imported third-party games cannot be exported.
 */
export const GameCardActions: React.FC<GameCardActionsProps> = ({
  game,
  onEdit,
  onExportJson,
  onExportPcio,
  onDelete,
  onSaveToServer,
  busy = false,
  canDelete = true,
}) => {
  const { t } = useTranslation();
  const [shareAnchor, setShareAnchor] = useState<null | HTMLElement>(null);
  const shareBlocked = isThirdPartySummary(game);
  const closeShare = () => setShareAnchor(null);
  const pick = (action: (id: string) => void) => {
    closeShare();
    action(game.id);
  };
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  return (
    <>
      <Box display="flex" gap={0.5}>
        <Tooltip title={t('common.edit')}>
          <IconButton size="small" onClick={() => onEdit(game.id)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('games.tabletop.share')}>
          <IconButton
            size="small"
            color="primary"
            aria-label={t('games.tabletop.share')}
            onClick={(e) => setShareAnchor(e.currentTarget)}
          >
            <ShareIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Menu anchorEl={shareAnchor} open={Boolean(shareAnchor)} onClose={closeShare}>
          {shareBlocked && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ px: 2, py: 1, maxWidth: 320 }}
              data-testid="tabletop-share-blocked"
            >
              {t('games.tabletop.workshop.share_blocked')}
            </Typography>
          )}
          <MenuItem disabled={shareBlocked} onClick={() => pick(onExportPcio)}>
            {t('games.tabletop.export_pcio')}
          </MenuItem>
          <MenuItem disabled={shareBlocked} onClick={() => pick(onExportJson)}>
            {t('games.tabletop.export_json')}
          </MenuItem>
          {onSaveToServer && (
            <MenuItem disabled={busy} onClick={() => pick(onSaveToServer)}>
              {t('games.tabletop.save_to_server')}
            </MenuItem>
          )}
        </Menu>
        {canDelete && (
          <Tooltip title={t('common.delete')}>
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
        title={t('games.tabletop.confirm_delete_title')}
        message={t('games.tabletop.confirm_delete_message', { name: game.name })}
        confirmText={t('common.delete')}
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
