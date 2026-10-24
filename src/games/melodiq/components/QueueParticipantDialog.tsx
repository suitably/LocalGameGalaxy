import React from 'react';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  Typography,
} from '@mui/material';
import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd';
import type { MelodiqProfile } from '../types';
import { useQueue } from '../hooks/useQueue';
import { useWebRTC } from '../audio/WebRTCContext';
import { ActiveParticipantRow, AvailableProfileRow, type MicNames } from './QueueParticipantRows';
import {
  BOT_PROFILE_ID,
  isParticipating,
  type ParticipantEntry,
  type ParticipantProfile,
} from './queueParticipantTypes';

interface QueueParticipantDialogProps {
  open: boolean;
  onClose: () => void;
  /** ID of a queue item (upcoming songs mode). Mutually exclusive with `directParticipants`. */
  queueItemId: string | null;
  /** Participants list for the current song (direct mode). Mutually exclusive with `queueItemId`. */
  directParticipants?: ParticipantEntry[] | null;
  /** Called when toggling a participant in direct mode. */
  onDirectToggle?: (deviceId: string, profile: MelodiqProfile) => void;
  /** Called when reordering participants in direct mode. */
  onDirectReorder?: (startIndex: number, endIndex: number) => void;
}

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ p: 2, bgcolor: 'background.default' }}>
    <Typography variant="overline" color="text.secondary">
      {children}
    </Typography>
  </Box>
);

export const QueueParticipantDialog: React.FC<QueueParticipantDialogProps> = ({
  open,
  onClose,
  queueItemId,
  directParticipants,
  onDirectToggle,
  onDirectReorder,
}) => {
  const { t } = useTranslation();
  const { queue, toggleQueueParticipant, reorderQueueParticipant } = useQueue();
  const { activePeers } = useWebRTC();

  // Resolve the participants list from either queue item or direct props
  const isDirectMode = !queueItemId && directParticipants !== undefined;
  const item = isDirectMode ? null : queue.find((q) => q.id === queueItemId);

  // Combine local profiles and connected remote peers
  const localProfiles = storage.getJson<ParticipantProfile[]>(STORAGE_KEYS.PROFILES, []);
  const remoteProfiles: ParticipantProfile[] = activePeers.map((peer) => ({
    id: peer.deviceId || peer.peerId, // Prefer deviceId to match what is stored in queue participants
    peerId: peer.peerId,
    name: peer.name,
    hue: peer.hue || 0,
    isRemote: true,
  }));

  // Explicitly add the bot so it can be toggled
  const botProfile: ParticipantProfile = {
    id: BOT_PROFILE_ID,
    name: t('melodiq.participant_bot'),
    hue: 330,
    isRemote: false,
  };
  const allProfiles = [botProfile, ...localProfiles, ...remoteProfiles];

  // In queue-item mode, bail out if the item is not found
  if (!isDirectMode && !item) return null;

  const participants: ParticipantEntry[] = isDirectMode
    ? directParticipants || []
    : item?.participants || [];
  const nonParticipatingProfiles = allProfiles.filter((p) => !isParticipating(participants, p));

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    if (isDirectMode) {
      onDirectReorder?.(result.source.index, result.destination.index);
    } else if (item && reorderQueueParticipant) {
      reorderQueueParticipant(item.id, result.source.index, result.destination.index);
    }
  };

  const handleToggle = (deviceId: string, profile: ParticipantEntry | ParticipantProfile) => {
    if (isDirectMode) {
      onDirectToggle?.(deviceId, profile as unknown as MelodiqProfile);
    } else if (item) {
      toggleQueueParticipant(item.id, deviceId, profile);
    }
  };

  const readMics = (): MicNames => ({
    slots: storage.getJson<string[]>(STORAGE_KEYS.MELODIQ_MIC_SLOTS, []),
    names: storage.getJson<Record<string, string>>(STORAGE_KEYS.MELODIQ_MIC_NAMES, {}),
    originalNames: storage.getJson<Record<string, string>>(
      STORAGE_KEYS.MELODIQ_MIC_ORIGINAL_NAMES,
      {},
    ),
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {isDirectMode ? t('melodiq.manage_current_participants') : t('melodiq.manage_participants')}
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <SectionLabel>{t('melodiq.participants_active')}</SectionLabel>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="participants-list">
            {(provided) => {
              const mics = readMics();
              return (
                <List {...provided.droppableProps} ref={provided.innerRef} sx={{ pt: 0 }}>
                  {participants.map((p, index) => (
                    <ActiveParticipantRow
                      key={p.profileId || p.deviceId || `temp-${index}`}
                      participant={p}
                      participants={participants}
                      index={index}
                      mics={mics}
                      onToggle={handleToggle}
                    />
                  ))}
                  {provided.placeholder}
                </List>
              );
            }}
          </Droppable>
        </DragDropContext>

        {nonParticipatingProfiles.length > 0 && (
          <>
            <SectionLabel>{t('melodiq.participants_available')}</SectionLabel>
            <List sx={{ pt: 0 }}>
              {nonParticipatingProfiles.map((profile) => (
                <AvailableProfileRow key={profile.id} profile={profile} onToggle={handleToggle} />
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
};
