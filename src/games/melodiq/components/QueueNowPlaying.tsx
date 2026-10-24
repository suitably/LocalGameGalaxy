import React from 'react';
import { Box, Typography, IconButton, Avatar } from '@mui/material';
import { alpha } from '@mui/material/styles';
import MusicNoteIcon from '@mui/icons-material/MusicNoteRounded';
import EditIcon from '@mui/icons-material/EditRounded';
import { useTranslation } from 'react-i18next';
import type { SongMeta } from '../db';
import type { MelodiqParticipant } from '../types';
import { QueueParticipantAvatars } from './QueueParticipantAvatars';

interface QueueNowPlayingProps {
  song: SongMeta & { requester?: string };
  participants?: MelodiqParticipant[] | null;
  canEdit: boolean;
  onEdit: () => void;
}

/** Highlighted "now playing" block at the top of the host queue drawer. */
export const QueueNowPlaying: React.FC<QueueNowPlayingProps> = ({
  song,
  participants,
  canEdit,
  onEdit,
}) => {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        px: 2.5,
        py: 2,
        bgcolor: (theme) => alpha(theme.palette.success.main, 0.16),
        borderBottom: 1,
        borderColor: 'success.main',
      }}
    >
      <Typography
        variant="overline"
        sx={{ color: 'success.main', fontWeight: 'bold', letterSpacing: 1.5 }}
      >
        {t('melodiq.queue_drawer.now_playing', 'Now Playing')}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
        <Avatar
          sx={{ bgcolor: 'success.main', color: 'success.contrastText', width: 44, height: 44 }}
        >
          <MusicNoteIcon />
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold" noWrap>
            {song.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {song.artist}
            {song.requester ? ` · ${t('melodiq.queue_added_by', { name: song.requester })}` : ''}
          </Typography>
          {participants && participants.length > 0 && (
            <Box sx={{ mt: 0.5 }}>
              <QueueParticipantAvatars participants={participants} size={20} overlap={0.5} />
            </Box>
          )}
        </Box>
        {canEdit && (
          <IconButton
            size="small"
            onClick={onEdit}
            sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            title={t('melodiq.manage_current_participants')}
          >
            <EditIcon />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};
