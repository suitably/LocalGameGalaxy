import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useClientEngine } from '../PhoneClientEngine';
import { MicrophoneManager } from '../audio/MicrophoneManager';
import { RemoteLatencyCalibrator } from './RemoteLatencyCalibrator';
import { LiveMicTest } from './LiveMicTest';

type DisplayMode = 'lyrics' | 'self' | 'all';

interface ClientSettingsProps {
  onBack: () => void;
}

export const ClientSettings: React.FC<ClientSettingsProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { clientProfile, updateClientProfile, sendClientCommand, activeSongId } = useClientEngine();

  const [name, setName] = useState(clientProfile.name);
  const [hue, setHue] = useState(clientProfile.hue);
  const [deviceId, setDeviceId] = useState(clientProfile.micDeviceId || '');
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    clientProfile.displayMode || 'lyrics',
  );
  const [latency, setLatency] = useState(clientProfile.latency || 0);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadDevices = async () => {
      try {
        // Request temporary stream to trigger permission prompt so labels are available
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const devs = await MicrophoneManager.getDevices();
        if (mounted) {
          setDevices(devs);
          setPermissionError(false);
        }
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.error('Microphone permission denied:', err);
        if (mounted) {
          setPermissionError(true);
          // Fallback to whatever devices we can see without permission
          const devs = await MicrophoneManager.getDevices();
          setDevices(devs);
        }
      }
    };
    loadDevices();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = () => {
    updateClientProfile({
      name,
      hue,
      micDeviceId: deviceId || undefined,
      displayMode,
      latency,
    });
    onBack();
  };

  return (
    <Box
      sx={{ p: { xs: 1.5, sm: 2 }, minHeight: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <Paper
        sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5, flex: 1 }}
      >
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          {t('melodiq.client_settings', 'Player Profile')}
        </Typography>

        <TextField
          label={t('melodiq.name', 'Your Name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          variant="outlined"
          fullWidth
        />

        <Box>
          <Typography gutterBottom color="text.secondary" sx={{ mb: 1 }}>
            {t('melodiq.color', 'Your Color')}
          </Typography>
          <input
            type="range"
            min="0"
            max="360"
            value={hue}
            onChange={(e) => setHue(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <Box
            sx={{
              mt: 2,
              width: '100%',
              height: 40,
              borderRadius: 2,
              bgcolor: `hsl(${hue}, 100%, 50%)`,
            }}
          />
        </Box>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>{t('melodiq.microphone', 'Microphone')}</InputLabel>
          <Select
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            label={t('melodiq.microphone', 'Microphone')}
          >
            <MenuItem value="">
              <em>{t('melodiq.default_mic', 'Default Microphone')}</em>
            </MenuItem>
            {devices.map((d) => (
              <MenuItem key={d.deviceId} value={d.deviceId}>
                {d.label || `Microphone (ID: ${d.deviceId.substring(0, 5)})`}
              </MenuItem>
            ))}
          </Select>
          {permissionError && (
            <Typography variant="caption" color="error" sx={{ mt: 1 }}>
              {t(
                'melodiq.mic_permission_denied',
                'Permission denied. Could not load microphone names.',
              )}
            </Typography>
          )}
        </FormControl>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>{t('melodiq.display_mode', 'Display Mode')}</InputLabel>
          <Select
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
            label={t('melodiq.display_mode', 'Display Mode')}
          >
            <MenuItem value="lyrics">{t('melodiq.display_lyrics_only', 'Only Lyrics')}</MenuItem>
            <MenuItem value="self">{t('melodiq.display_self_pitch', 'My Pitch & Lyrics')}</MenuItem>
            <MenuItem value="all">{t('melodiq.display_all_pitch', "Everyone's Pitch")}</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ mt: 2, p: 2, bgcolor: 'action.disabledBackground', borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            {t('melodiq.settings.sync_latency', 'Sync & Latency')}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, fontVariantNumeric: 'tabular-nums' }}
          >
            {t('melodiq.settings.latency_offset', 'Current Latency Offset: {{ms}}ms', {
              ms: latency,
            })}
          </Typography>
          {activeSongId ? (
            <Typography variant="caption" color="error">
              {t('melodiq.settings.calibrate_blocked', 'Cannot calibrate while a song is playing.')}
            </Typography>
          ) : (
            <RemoteLatencyCalibrator
              deviceId={deviceId}
              sendClientCommand={sendClientCommand}
              onComplete={(ms) => setLatency(ms)}
            />
          )}
        </Box>

        <LiveMicTest deviceId={deviceId} />

        <Box sx={{ flex: 1 }} />

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button variant="outlined" onClick={onBack} fullWidth>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="contained" onClick={handleSave} fullWidth>
            {t('common.save', 'Save')}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
