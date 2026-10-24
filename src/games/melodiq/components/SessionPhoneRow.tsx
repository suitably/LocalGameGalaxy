import React from 'react';
import { Box, Typography, MenuItem, Select, IconButton, Avatar } from '@mui/material';
import { useTranslation } from 'react-i18next';
import CloseIcon from '@mui/icons-material/Close';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import type { ClientRole } from '../types';
import type { MicRemotePeer } from '../audio/WebRTCMicManager';

interface SessionPhoneRowProps {
  peer: MicRemotePeer;
  role: ClientRole;
  onRoleChange: (role: ClientRole) => void;
  onRemove: () => void;
}

/** A connected phone that is part of the roster, with its permission role. */
export const SessionPhoneRow: React.FC<SessionPhoneRowProps> = ({
  peer,
  role,
  onRoleChange,
  onRemove,
}) => {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 1,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'action.disabledBackground',
      }}
    >
      <SmartphoneIcon sx={{ width: 24 }} />
      <Avatar
        sx={{
          bgcolor: peer.hue ? `hsl(${peer.hue}, 100%, 50%)` : 'action.selected',
          width: 32,
          height: 32,
        }}
      >
        {peer.name[0]}
      </Avatar>
      <Typography sx={{ flex: 1, fontWeight: 'bold' }}>{peer.name}</Typography>
      <Select
        size="small"
        value={role}
        onChange={(e) => onRoleChange(e.target.value as ClientRole)}
        sx={{ height: 32 }}
      >
        <MenuItem value="admin">{t('melodiq.setup.role_admin', 'Admin')}</MenuItem>
        <MenuItem value="queue_manager">
          {t('melodiq.setup.role_queue_manager', 'Queue Manager')}
        </MenuItem>
        <MenuItem value="queue_contributor">
          {t('melodiq.setup.role_queue_contributor', 'Queue Contributor')}
        </MenuItem>
        <MenuItem value="singer">{t('melodiq.setup.role_singer', 'Singer')}</MenuItem>
      </Select>
      <IconButton color="error" onClick={onRemove}>
        <CloseIcon />
      </IconButton>
    </Box>
  );
};
