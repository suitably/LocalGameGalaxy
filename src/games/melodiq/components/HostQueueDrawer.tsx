import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer, Box, Typography, IconButton, List, Button, Badge, Divider } from '@mui/material';
import CloseIcon from '@mui/icons-material/CloseRounded';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlayRounded';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweepRounded';
import HistoryIcon from '@mui/icons-material/HistoryRounded';
import { useQueue } from '../hooks/useQueue';
import { useQueueDrag } from '../hooks/useQueueDrag';
import { useClientEngine } from '../PhoneClientEngine';
import type { MelodiqParticipant, MelodiqProfile } from '../types';
import { QueueParticipantDialog } from './QueueParticipantDialog';
import { QueueNowPlaying } from './QueueNowPlaying';
import { QueueDrawerItem } from './QueueDrawerItem';
import { HistoryDrawer } from './HistoryDrawer';

interface HostQueueDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Participants for the currently playing song, for editing. */
  activeParticipants?: MelodiqParticipant[] | null;
  /** Called when a participant is toggled on/off for the current song. */
  onToggleCurrentParticipant?: (deviceId: string, profile: MelodiqProfile) => void;
  /** Called when participants are reordered for the current song. */
  onReorderCurrentParticipant?: (startIndex: number, endIndex: number) => void;
}

export const HostQueueDrawer: React.FC<HostQueueDrawerProps> = ({
  open,
  onClose,
  activeParticipants,
  onToggleCurrentParticipant,
  onReorderCurrentParticipant,
}) => {
  const { t } = useTranslation();
  const { queue, nowPlaying, removeFromQueue, moveItem, clearQueue, toggleQueueParticipant } =
    useQueue();
  const { clientRole, clientProfile } = useClientEngine();
  const isClient = new URLSearchParams(window.location.search).get('role') === 'client';
  const canManageQueue = true; // All users can manage the queue now
  const canEditParticipants = !isClient || clientRole === 'admin' || clientRole === 'queue_manager';

  const drag = useQueueDrag(moveItem);
  const [manageParticipantsId, setManageParticipantsId] = useState<string | null>(null);
  const [editCurrentParticipantsOpen, setEditCurrentParticipantsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          maxHeight: '70vh',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          marginBottom: '64px',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'divider' }} />
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          py: 1.5,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PlaylistPlayIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">
            {t('melodiq.queue')}
          </Typography>
          {queue.length > 0 && (
            <Badge badgeContent={queue.length} color="primary" sx={{ ml: 0.5 }} />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {queue.length > 0 && canManageQueue && (
            <Button
              size="small"
              color="error"
              onClick={clearQueue}
              startIcon={<DeleteSweepIcon />}
              sx={{ borderRadius: 50, textTransform: 'none', mr: 1 }}
            >
              {t('melodiq.queue_drawer.clear', 'Clear')}
            </Button>
          )}
          <IconButton
            onClick={() => setHistoryOpen(true)}
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            <HistoryIcon />
          </IconButton>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      <Divider />

      <Box sx={{ overflow: 'auto', flexGrow: 1, pb: 2 }}>
        {nowPlaying && (
          <QueueNowPlaying
            song={nowPlaying}
            participants={activeParticipants}
            canEdit={canEditParticipants}
            onEdit={() => setEditCurrentParticipantsOpen(true)}
          />
        )}

        <Box sx={{ px: 2.5, pt: 2, pb: 0.5 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.5 }}>
            {t('melodiq.queue_drawer.up_next', {
              count: queue.length,
              defaultValue: 'Up Next · {{count}}',
            })}
          </Typography>
        </Box>

        {queue.length === 0 ? (
          <Box sx={{ px: 2.5, py: 6, textAlign: 'center' }}>
            <PlaylistPlayIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              {t('melodiq.queue_drawer.empty', 'Queue is empty')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('melodiq.queue_drawer.empty_hint', 'Long-press a song to add it to the queue')}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {queue.map((item, index) => (
              <QueueDrawerItem
                key={item.id}
                item={item}
                index={index}
                draggable={canManageQueue}
                isDragging={drag.dragIndex === index}
                isDragOver={drag.dragOverIndex === index}
                onDragStart={() => drag.handleDragStart(index)}
                onDragOver={(e) => drag.handleDragOver(e, index)}
                onDrop={(e) => drag.handleDrop(e, index)}
                onDragEnd={drag.handleDragEnd}
                selfDeviceId={isClient ? clientProfile.deviceId : undefined}
                onToggleSelf={() =>
                  toggleQueueParticipant(item.id, clientProfile.deviceId, clientProfile)
                }
                canEditParticipants={canEditParticipants}
                onEditParticipants={() => setManageParticipantsId(item.id)}
                canRemove={
                  !isClient ||
                  canManageQueue ||
                  (clientRole === 'queue_contributor' &&
                    item.requesterId === clientProfile.deviceId)
                }
                onRemove={() => removeFromQueue(item.id)}
              />
            ))}
          </List>
        )}
      </Box>

      <QueueParticipantDialog
        open={!!manageParticipantsId}
        onClose={() => setManageParticipantsId(null)}
        queueItemId={manageParticipantsId}
      />

      <QueueParticipantDialog
        open={editCurrentParticipantsOpen}
        onClose={() => setEditCurrentParticipantsOpen(false)}
        queueItemId={null}
        directParticipants={activeParticipants}
        onDirectToggle={onToggleCurrentParticipant}
        onDirectReorder={onReorderCurrentParticipant}
      />

      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </Drawer>
  );
};
