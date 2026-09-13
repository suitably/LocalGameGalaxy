import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PublishIcon from '@mui/icons-material/Publish';
import GroupsIcon from '@mui/icons-material/Groups';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import { useTranslation } from 'react-i18next';
import type { TabletopGameSummary } from '../../logic/types';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';

interface GameCardItemProps {
  game: TabletopGameSummary;
  onPlayParty: (id: string) => void;
  onPlayLocal: (id: string) => void;
  onEdit: (id: string) => void;
  onExportJson: (id: string) => void;
  onExportPcio: (id: string) => void;
  onPublish: (id: string) => void;
  onDelete: (id: string) => void;
}

export const GameCardItem: React.FC<GameCardItemProps> = ({
  game,
  onPlayParty,
  onPlayLocal,
  onEdit,
  onExportJson,
  onExportPcio,
  onPublish,
  onDelete,
}) => {
  const { t } = useTranslation();
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const [playAnchor, setPlayAnchor] = useState<null | HTMLElement>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const canPlayParty = game.supportedModes.includes('party_multi_device');
  const canPlayLocal = game.supportedModes.includes('local_pass_and_play') || game.supportedModes.includes('solo');

  const handlePlayClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (canPlayParty && canPlayLocal) {
      setPlayAnchor(event.currentTarget);
    } else if (canPlayParty) {
      onPlayParty(game.id);
    } else {
      onPlayLocal(game.id);
    }
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, p: 1, '&:hover': { borderColor: 'primary.main' } }}>
      <CardContent sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {game.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('games.tabletop.by_author', 'von {{author}}', { author: game.author || 'Community' })} • {game.minPlayers}-{game.maxPlayers} {t('common.players', 'Spieler')}
            </Typography>
          </Box>
          <Box display="flex" gap={0.5}>
            {canPlayParty && (
              <Tooltip title={t('games.tabletop.mode_party', 'Party-Modus')}>
                <Chip icon={<GroupsIcon />} size="small" color="primary" variant="outlined" />
              </Tooltip>
            )}
            {canPlayLocal && (
              <Tooltip title={t('games.tabletop.mode_local', 'Lokal / Pass-and-Play')}>
                <Chip icon={<PhoneIphoneIcon />} size="small" color="secondary" variant="outlined" />
              </Tooltip>
            )}
          </Box>
        </Box>

        {game.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1, maxHeight: 40, overflow: 'hidden' }}>
            {game.description}
          </Typography>
        )}

        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<PlayArrowIcon />}
            onClick={handlePlayClick}
          >
            {t('common.play', 'Spielen')}
          </Button>

          <Menu anchorEl={playAnchor} open={Boolean(playAnchor)} onClose={() => setPlayAnchor(null)}>
            <MenuItem onClick={() => { setPlayAnchor(null); onPlayParty(game.id); }}>
              <GroupsIcon sx={{ mr: 1, fontSize: 20 }} /> {t('games.tabletop.play_party_choice', 'Im Party-Modus starten')}
            </MenuItem>
            <MenuItem onClick={() => { setPlayAnchor(null); onPlayLocal(game.id); }}>
              <PhoneIphoneIcon sx={{ mr: 1, fontSize: 20 }} /> {t('games.tabletop.play_local_choice', 'Lokal an diesem Gerät spielen')}
            </MenuItem>
          </Menu>

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
            <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}>
              <MenuItem onClick={() => { setExportAnchor(null); onExportPcio(game.id); }}>
                {t('games.tabletop.export_pcio', 'Als .pcio (ZIP) exportieren')}
              </MenuItem>
              <MenuItem onClick={() => { setExportAnchor(null); onExportJson(game.id); }}>
                {t('games.tabletop.export_json', 'Als .json exportieren')}
              </MenuItem>
            </Menu>
            <Tooltip title={t('games.tabletop.publish', 'Als PR einreichen')}>
              <IconButton size="small" color="primary" onClick={() => onPublish(game.id)}>
                <PublishIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.delete', 'Löschen')}>
              <IconButton size="small" color="error" onClick={() => setDeleteConfirmOpen(true)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title={t('games.tabletop.confirm_delete_title', 'Spiel löschen?')}
        message={t('games.tabletop.confirm_delete_message', 'Möchtest du "{{name}}" wirklich unwiderruflich aus deinem Speicher löschen?', { name: game.name })}
        confirmText={t('common.delete', 'Löschen')}
        confirmColor="error"
        onConfirm={() => { setDeleteConfirmOpen(false); onDelete(game.id); }}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </Card>
  );
};
