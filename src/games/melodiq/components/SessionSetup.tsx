import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import type { UserProfile, ActivePlayer } from '../types';
import { useWebRTC } from '../audio/WebRTCContext';
import { useClientRoles } from '../hooks/useClientRoles';
import { SessionRosterRow, BOT_ID } from './SessionRosterRow';
import { SessionPhoneRow } from './SessionPhoneRow';
import { PlayerSettingsPopover } from './PlayerSettingsPopover';

interface SessionSetupProps {
  profiles: UserProfile[];
  activePlayers: ActivePlayer[];
  devices: MediaDeviceInfo[];
  loadingDevices: boolean;
  onRefreshDevices: () => void;
  onToggleActivePlayer: (profileId: string) => void;
  onMoveActivePlayer: (index: number, direction: 'up' | 'down') => void;
  onUpdateActivePlayerConfig: (profileId: string, updates: Partial<ActivePlayer>) => void;
}

export const SessionSetup: React.FC<SessionSetupProps> = ({
  profiles,
  activePlayers,
  devices,
  loadingDevices,
  onRefreshDevices,
  onToggleActivePlayer,
  onMoveActivePlayer,
  onUpdateActivePlayerConfig,
}) => {
  const { t } = useTranslation();
  const { peers, activePeers, inactivePeers, togglePeerActive } = useWebRTC();
  const { getRole, setRole } = useClientRoles();

  const [settingsAnchorEl, setSettingsAnchorEl] = useState<HTMLElement | null>(null);
  const [settingsProfileId, setSettingsProfileId] = useState<string | null>(null);

  const closeSettings = () => {
    setSettingsAnchorEl(null);
    setSettingsProfileId(null);
  };

  const botLabel = t('melodiq.setup.bot', 'Bot (Auto-Sing)');
  const availableProfiles = profiles.filter(
    (p) => !activePlayers.some((ap) => ap.profileId === p.id),
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('melodiq.setup.title', 'Session Setup')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t(
          'melodiq.setup.intro',
          'Select who is playing today. Use the arrows to reorder priority/position.',
        )}
      </Typography>

      <Button
        variant="outlined"
        onClick={onRefreshDevices}
        sx={{ mb: 2, borderRadius: 50, px: 3 }}
        startIcon={<RefreshIcon />}
      >
        {t('melodiq.setup.refresh_devices', 'Refresh Devices')}
      </Button>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {profiles.length === 0 && (
          <Typography>{t('melodiq.setup.no_profiles', 'No profiles found.')}</Typography>
        )}

        <Typography variant="subtitle2">
          {t('melodiq.setup.active_roster', 'Active Roster (Ordered)')}
        </Typography>
        {activePlayers.map((ap, index) => {
          const isBot = ap.profileId === BOT_ID;
          const profile = isBot
            ? { id: BOT_ID, name: botLabel, hue: 0 }
            : profiles.find((p) => p.id === ap.profileId);
          if (!profile) return null;
          return (
            <SessionRosterRow
              key={ap.profileId}
              player={ap}
              name={profile.name}
              hue={profile.hue}
              index={index}
              count={activePlayers.length}
              devices={devices}
              loadingDevices={loadingDevices}
              phones={peers}
              onMove={(direction) => onMoveActivePlayer(index, direction)}
              onUpdate={(updates) => onUpdateActivePlayerConfig(ap.profileId, updates)}
              onOpenSettings={(e) => {
                setSettingsProfileId(ap.profileId);
                setSettingsAnchorEl(e.currentTarget);
              }}
              onRemove={() => onToggleActivePlayer(ap.profileId)}
            />
          );
        })}

        {activePeers.map((peer) => {
          const roleKey = peer.deviceId || peer.peerId;
          return (
            <SessionPhoneRow
              key={peer.peerId}
              peer={peer}
              role={getRole(roleKey)}
              onRoleChange={(role) => setRole(roleKey, role)}
              onRemove={() => togglePeerActive(peer.peerId)}
            />
          );
        })}

        <PlayerSettingsPopover
          anchorEl={settingsAnchorEl}
          player={activePlayers.find((ap) => ap.profileId === settingsProfileId)}
          onClose={closeSettings}
          onUpdate={(updates) => {
            if (settingsProfileId) onUpdateActivePlayerConfig(settingsProfileId, updates);
          }}
        />

        <Typography variant="subtitle2" sx={{ mt: 2 }}>
          {t('melodiq.setup.available_profiles', 'Available Profiles')}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {availableProfiles.map((p) => (
            <Button
              key={p.id}
              variant="outlined"
              startIcon={<FiberManualRecordIcon sx={{ color: `hsl(${p.hue}, 100%, 50%)` }} />}
              onClick={() => onToggleActivePlayer(p.id)}
              sx={{ borderRadius: 50 }}
            >
              {p.name}
            </Button>
          ))}

          {!activePlayers.some((ap) => ap.profileId === BOT_ID) && (
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<SmartToyIcon />}
              onClick={() => onToggleActivePlayer(BOT_ID)}
              sx={{ borderRadius: 50 }}
            >
              {botLabel}
            </Button>
          )}

          {profiles.length === 0 && (
            <Typography variant="caption">
              {t('melodiq.setup.create_profiles', 'Create profiles above.')}
            </Typography>
          )}

          {inactivePeers.map((peer) => (
            <Button
              key={peer.peerId}
              variant="outlined"
              startIcon={<SmartphoneIcon />}
              onClick={() => togglePeerActive(peer.peerId)}
              sx={{ borderColor: peer.hue ? `hsl(${peer.hue}, 100%, 50%)` : undefined }}
            >
              {peer.name}
            </Button>
          ))}
        </Box>
      </Box>
    </Box>
  );
};
