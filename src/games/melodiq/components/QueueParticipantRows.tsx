import React from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, Box, ListItem, ListItemAvatar, ListItemText, Switch } from '@mui/material';
import DragHandleIcon from '@mui/icons-material/DragHandleRounded';
import MicIcon from '@mui/icons-material/MicRounded';
import PersonIcon from '@mui/icons-material/PersonRounded';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroidRounded';
import SmartToyIcon from '@mui/icons-material/SmartToyRounded';
import { Draggable } from '@hello-pangea/dnd';
import {
  BOT_PROFILE_ID,
  isLocalHuman,
  localSlotIndexOf,
  type ParticipantEntry,
  type ParticipantProfile,
} from './queueParticipantTypes';

export interface MicNames {
  slots: string[];
  names: Record<string, string>;
  originalNames: Record<string, string>;
}

const avatarSx = (hue: number | undefined) => ({ bgcolor: `hsl(${hue || 0}, 80%, 40%)` });

const initialOf = (name: string | undefined) => (name ? name.charAt(0).toUpperCase() : '?');

const Hint: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
    {icon}
    {text}
  </Box>
);

interface ActiveRowProps {
  participant: ParticipantEntry;
  participants: ParticipantEntry[];
  index: number;
  mics: MicNames;
  onToggle: (deviceId: string, profile: ParticipantEntry) => void;
}

/** Draggable row for a participant who sings in this item. */
export const ActiveParticipantRow: React.FC<ActiveRowProps> = ({
  participant: p,
  participants,
  index,
  mics,
  onToggle,
}) => {
  const { t } = useTranslation();
  const iconSx = { fontSize: 16 };

  let secondary: React.ReactNode;
  if (p.isRemote) {
    secondary = (
      <Hint icon={<PhoneAndroidIcon sx={iconSx} />} text={t('melodiq.participant_phone')} />
    );
  } else if (p.profileId === BOT_PROFILE_ID) {
    secondary = <Hint icon={<SmartToyIcon sx={iconSx} />} text={t('melodiq.participant_bot')} />;
  } else {
    secondary = <Hint icon={<PersonIcon sx={iconSx} />} text={t('melodiq.participant_local')} />;
  }
  if (isLocalHuman(p)) {
    const slot = localSlotIndexOf(participants, index);
    const deviceId = mics.slots[slot];
    const micName =
      (deviceId && (mics.names[deviceId] || mics.originalNames[deviceId])) ||
      t('melodiq.participant_mic', { n: slot + 1 });
    secondary = <Hint icon={<MicIcon sx={iconSx} />} text={micName} />;
  }

  const id = p.profileId || p.deviceId || `temp-${index}`;
  return (
    <Draggable key={id} draggableId={id} index={index}>
      {(provided, snapshot) => (
        <ListItem
          ref={provided.innerRef}
          {...provided.draggableProps}
          sx={{
            bgcolor: snapshot.isDragging ? 'action.selected' : 'inherit',
            ...provided.draggableProps.style,
          }}
        >
          <Box
            {...provided.dragHandleProps}
            sx={{ mr: 2, display: 'flex', alignItems: 'center', color: 'action.active' }}
          >
            <DragHandleIcon />
          </Box>
          <ListItemAvatar>
            <Avatar sx={avatarSx(p.hue)}>{initialOf(p.name)}</Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={p.name || t('melodiq.participant_unknown')}
            secondary={secondary}
          />
          <Switch
            edge="end"
            checked
            onChange={() => onToggle((p.profileId || p.deviceId) as string, p)}
          />
        </ListItem>
      )}
    </Draggable>
  );
};

interface AvailableRowProps {
  profile: ParticipantProfile;
  onToggle: (deviceId: string, profile: ParticipantProfile) => void;
}

/** Row for a profile that is not singing yet. */
export const AvailableProfileRow: React.FC<AvailableRowProps> = ({ profile, onToggle }) => {
  const { t } = useTranslation();
  const kind =
    profile.id === BOT_PROFILE_ID
      ? 'participant_bot'
      : profile.isRemote
        ? 'participant_phone'
        : 'participant_local';
  return (
    <ListItem>
      <Box sx={{ width: 40 }} /> {/* Spacer for drag handle alignment */}
      <ListItemAvatar>
        <Avatar sx={avatarSx(profile.hue)}>{initialOf(profile.name)}</Avatar>
      </ListItemAvatar>
      <ListItemText primary={profile.name} secondary={t(`melodiq.${kind}`)} />
      <Switch edge="end" checked={false} onChange={() => onToggle(profile.id, profile)} />
    </ListItem>
  );
};
