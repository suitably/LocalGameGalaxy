import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/DeleteRounded';
import DragHandleIcon from '@mui/icons-material/DragHandleRounded';
import MusicNoteIcon from '@mui/icons-material/MusicNoteRounded';
import MicIcon from '@mui/icons-material/MicRounded';
import MicOffIcon from '@mui/icons-material/MicOffRounded';
import EditIcon from '@mui/icons-material/EditRounded';
import type { QueueItem } from '../hooks/useQueue';
import type { MelodiqParticipant } from '../types';
import { QueueParticipantAvatars } from './QueueParticipantAvatars';
import { transitionOf } from '../../../lib/motion';

interface QueueDrawerItemProps {
  item: QueueItem;
  index: number;
  isDragging: boolean;
  isDragOver: boolean;
  draggable: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  /** Set on phone clients: lets the viewer toggle their own mic for this song. */
  selfDeviceId?: string;
  onToggleSelf: () => void;
  canEditParticipants: boolean;
  onEditParticipants: () => void;
  canRemove: boolean;
  onRemove: () => void;
}

/** One row of the host queue: drag handle, position, song, singers and actions. */
export const QueueDrawerItem: React.FC<QueueDrawerItemProps> = ({
  item,
  index,
  isDragging,
  isDragOver,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  selfDeviceId,
  onToggleSelf,
  canEditParticipants,
  onEditParticipants,
  canRemove,
  onRemove,
}) => {
  const participants = (item.participants ?? []) as MelodiqParticipant[];
  const joined =
    selfDeviceId !== undefined && participants.some((p) => p.deviceId === selfDeviceId);

  return (
    <ListItem
      draggable={draggable}
      onDragStart={() => draggable && onDragStart()}
      onDragOver={(e) => draggable && onDragOver(e)}
      onDrop={(e) => draggable && onDrop(e)}
      onDragEnd={onDragEnd}
      sx={{
        px: 2.5,
        py: 1,
        cursor: draggable ? 'grab' : 'default',
        transition: transitionOf(['opacity', 'background-color', 'border-color']),
        opacity: isDragging ? 0.4 : 1,
        bgcolor: isDragOver ? (theme) => alpha(theme.palette.primary.main, 0.16) : 'transparent',
        borderTop: 2,
        borderColor: isDragOver ? 'primary.main' : 'transparent',
        '&:hover': { bgcolor: 'action.hover' },
        '&:active': { cursor: 'grabbing' },
      }}
    >
      {draggable && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mr: 1.5,
            color: 'text.disabled',
            cursor: 'grab',
          }}
        >
          <DragHandleIcon fontSize="small" />
        </Box>
      )}

      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          minWidth: 24,
          textAlign: 'center',
          mr: 1.5,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {index + 1}
      </Typography>

      <ListItemAvatar sx={{ minWidth: 40 }}>
        <Avatar sx={{ width: 36, height: 36, bgcolor: 'action.selected', color: 'text.primary' }}>
          <MusicNoteIcon fontSize="small" />
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={item.song.title}
        secondary={item.requester ? `${item.song.artist} · by ${item.requester}` : item.song.artist}
        primaryTypographyProps={{ noWrap: true, fontWeight: 500, fontSize: '0.95rem' }}
        secondaryTypographyProps={{ noWrap: true, fontSize: '0.8rem', color: 'text.secondary' }}
        sx={{ mr: 2, flex: 1 }}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {participants.length > 0 && (
          <Box sx={{ mr: 1 }}>
            <QueueParticipantAvatars participants={participants} size={24} overlap="stack" />
          </Box>
        )}

        {selfDeviceId !== undefined && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelf();
            }}
            sx={{
              bgcolor: joined ? 'primary.main' : 'action.selected',
              color: joined ? 'primary.contrastText' : 'text.primary',
              '&:hover': { bgcolor: joined ? 'primary.dark' : 'action.focus' },
            }}
          >
            {joined ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
          </IconButton>
        )}
        {canEditParticipants && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEditParticipants();
            }}
            sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        )}
        {canRemove && (
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            size="small"
            sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
    </ListItem>
  );
};
