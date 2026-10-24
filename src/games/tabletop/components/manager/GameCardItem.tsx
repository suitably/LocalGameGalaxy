import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import GroupsIcon from '@mui/icons-material/GroupsRounded';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphoneRounded';
import { useTranslation } from 'react-i18next';
import type { TabletopGameSummary } from '../../logic/types';
import { GameCardActions, type GameCardActionsProps } from './GameCardActions';

interface GameCardItemProps extends GameCardActionsProps {
  game: TabletopGameSummary;
  onPlayParty: (id: string) => void;
  onPlayLocal: (id: string) => void;
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
  onSaveToServer,
  busy = false,
  canDelete = true,
}) => {
  const { t } = useTranslation();
  const [playAnchor, setPlayAnchor] = useState<null | HTMLElement>(null);

  const canPlayParty = game.supportedModes.includes('party_multi_device');
  const canPlayLocal =
    game.supportedModes.includes('local_pass_and_play') || game.supportedModes.includes('solo');

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
    <Card
      variant="outlined"
      sx={{ borderRadius: 3, p: 1, '&:hover': { borderColor: 'primary.main' } }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {game.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('games.tabletop.by_author', 'von {{author}}', {
                author: game.author || 'Community',
              })}{' '}
              • {game.minPlayers}-{game.maxPlayers} {t('common.players', 'Spieler')}
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
                <Chip
                  icon={<PhoneIphoneIcon />}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              </Tooltip>
            )}
          </Box>
        </Box>

        {game.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, mb: 1, maxHeight: 40, overflow: 'hidden' }}
          >
            {game.description}
          </Typography>
        )}

        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}
        >
          <Button
            variant="contained"
            size="small"
            startIcon={<PlayArrowIcon />}
            onClick={handlePlayClick}
          >
            {t('common.play', 'Spielen')}
          </Button>

          <Menu
            anchorEl={playAnchor}
            open={Boolean(playAnchor)}
            onClose={() => setPlayAnchor(null)}
          >
            <MenuItem
              onClick={() => {
                setPlayAnchor(null);
                onPlayParty(game.id);
              }}
            >
              <GroupsIcon sx={{ mr: 1, fontSize: 20 }} />{' '}
              {t('games.tabletop.play_party_choice', 'Im Party-Modus starten')}
            </MenuItem>
            <MenuItem
              onClick={() => {
                setPlayAnchor(null);
                onPlayLocal(game.id);
              }}
            >
              <PhoneIphoneIcon sx={{ mr: 1, fontSize: 20 }} />{' '}
              {t('games.tabletop.play_local_choice', 'Lokal an diesem Gerät spielen')}
            </MenuItem>
          </Menu>

          <GameCardActions
            game={game}
            onEdit={onEdit}
            onExportJson={onExportJson}
            onExportPcio={onExportPcio}
            onPublish={onPublish}
            onDelete={onDelete}
            onSaveToServer={onSaveToServer}
            busy={busy}
            canDelete={canDelete}
          />
        </Box>
      </CardContent>
    </Card>
  );
};
