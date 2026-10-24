import React from 'react';
import {
  Box,
  Button,
  Typography,
  FormControl,
  MenuItem,
  Select,
  Slider,
  IconButton,
  Avatar,
  Divider,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import VolumeUpIcon from '@mui/icons-material/VolumeUpRounded';
import VolumeOffIcon from '@mui/icons-material/VolumeOffRounded';
import CloseIcon from '@mui/icons-material/CloseRounded';
import SettingsIcon from '@mui/icons-material/SettingsRounded';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import SmartToyIcon from '@mui/icons-material/SmartToyRounded';
import SmartphoneIcon from '@mui/icons-material/SmartphoneRounded';
import type { ActivePlayer } from '../types';
import type { MicRemotePeer } from '../audio/WebRTCMicManager';

export const BOT_ID = 'BOT';

interface SessionRosterRowProps {
  player: ActivePlayer;
  name: string;
  hue: number;
  index: number;
  count: number;
  devices: MediaDeviceInfo[];
  loadingDevices: boolean;
  phones: MicRemotePeer[];
  onMove: (direction: 'up' | 'down') => void;
  onUpdate: (updates: Partial<ActivePlayer>) => void;
  onOpenSettings: (event: React.MouseEvent<HTMLElement>) => void;
  onRemove: () => void;
}

/** One entry of the ordered singer roster: order, avatar, volume and input device. */
export const SessionRosterRow: React.FC<SessionRosterRowProps> = ({
  player,
  name,
  hue,
  index,
  count,
  devices,
  loadingDevices,
  phones,
  onMove,
  onUpdate,
  onOpenSettings,
  onRemove,
}) => {
  const { t } = useTranslation();
  const isBot = player.profileId === BOT_ID;
  const deviceKnown =
    player.deviceId === BOT_ID ||
    devices.some((d) => d.deviceId === player.deviceId) ||
    phones.some((p) => p.peerId === player.deviceId);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'stretch', md: 'center' },
        gap: 2,
        p: { xs: 1.5, md: 1 },
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <IconButton size="small" onClick={() => onMove('up')} disabled={index === 0}>
            <KeyboardArrowUpIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => onMove('down')} disabled={index === count - 1}>
            <KeyboardArrowDownIcon fontSize="small" />
          </IconButton>
        </Box>

        <Avatar
          sx={{
            bgcolor: isBot ? 'secondary.main' : `hsl(${hue}, 100%, 50%)`,
            color: isBot ? 'secondary.contrastText' : undefined,
            width: 32,
            height: 32,
          }}
        >
          {isBot ? <SmartToyIcon fontSize="small" /> : name[0]}
        </Avatar>
        <Typography sx={{ flex: 1, fontWeight: 'bold' }}>{name}</Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
        }}
      >
        <Button
          size="small"
          onClick={() => onUpdate({ muted: !(player.muted ?? false) })}
          color={player.muted ? 'error' : 'primary'}
          sx={{ minWidth: 40 }}
        >
          {player.muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
        </Button>

        <Slider
          size="small"
          value={typeof player.volume === 'number' ? player.volume * 100 : 80}
          min={0}
          max={100}
          onChange={(_, val) => onUpdate({ volume: (val as number) / 100 })}
          sx={{ width: 80, mx: 2 }}
          disabled={player.muted}
        />

        {isBot ? (
          <Typography variant="caption" sx={{ minWidth: 150, textAlign: 'center' }}>
            {t('melodiq.setup.auto_sing', 'Auto-Sing Enabled')}
          </Typography>
        ) : (
          <>
            <FormControl sx={{ minWidth: 150 }} size="small">
              <Select
                value={loadingDevices ? 'loading' : deviceKnown ? player.deviceId : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdate({ deviceId: val, isRemote: phones.some((p) => p.peerId === val) });
                }}
                disabled={loadingDevices}
                displayEmpty
                variant="standard"
              >
                <MenuItem value="">
                  <em>{t('melodiq.setup.no_device', 'No Device')}</em>
                </MenuItem>
                {loadingDevices && (
                  <MenuItem value="loading" disabled>
                    {t('melodiq.loading')}
                  </MenuItem>
                )}
                {devices.map((d) => (
                  <MenuItem key={d.deviceId} value={d.deviceId}>
                    {d.label || d.deviceId}
                  </MenuItem>
                ))}
                <Divider />
                {phones.length > 0 && (
                  <MenuItem disabled>
                    <em>{t('melodiq.setup.phones', 'Phones')}</em>
                  </MenuItem>
                )}
                {phones.map((p) => (
                  <MenuItem key={p.peerId} value={p.peerId}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SmartphoneIcon fontSize="small" />
                      <Typography>{p.name}</Typography>
                      {p.hue && (
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: `hsl(${p.hue}, 100%, 50%)`,
                          }}
                        />
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton size="small" onClick={onOpenSettings}>
              <SettingsIcon fontSize="small" />
            </IconButton>
          </>
        )}

        <IconButton color="error" onClick={onRemove}>
          <CloseIcon />
        </IconButton>
      </Box>
    </Box>
  );
};
