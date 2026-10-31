import React, { useCallback, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useClientEngine } from '../PhoneClientEngine';
import { SettingSlider, SettingSwitch, SettingToggleGroup } from '../../../components/settings';
import type { HostSettings, HostSettingsRpc } from '../types';

type VolumeKey = 'songVolume' | 'masterVolume' | 'vocalsVolume';

const LINE_OPTIONS = [0, 1, 2, 3].map((n) => ({ value: n, label: String(n) }));

/**
 * Lightweight host settings for an admin phone. It never touches the phone's own settings or
 * storage: every change is sent as a typed `HostSettingsRpc` and the host answers with its values.
 */
export const RemoteHostSettingsModal: React.FC = () => {
  const { t } = useTranslation();
  const { isHostSettingsOpen, setHostSettingsOpen, hostSettings, sendClientData } =
    useClientEngine();

  const send = useCallback(
    (rpc: HostSettingsRpc) => {
      sendClientData(rpc);
    },
    [sendClientData],
  );
  const set = useCallback(
    (patch: Partial<HostSettings>) => send({ type: 'host.settings.set', patch }),
    [send],
  );

  useEffect(() => {
    if (isHostSettingsOpen) send({ type: 'host.settings.get' });
  }, [isHostSettingsOpen, send]);

  const percent = (value: number) => `${Math.round(value * 100)}%`;

  return (
    <Dialog
      open={isHostSettingsOpen}
      onClose={() => setHostSettingsOpen(false)}
      fullWidth
      maxWidth="sm"
      scroll="paper"
    >
      <DialogTitle>{t('melodiq.remote_host.title', 'Host settings')}</DialogTitle>
      <DialogContent dividers>
        {!hostSettings ? (
          <Typography color="text.secondary">
            {t('melodiq.remote_host.loading', 'Loading host settings...')}
          </Typography>
        ) : (
          <HostSettingsForm settings={hostSettings} percent={percent} set={set} />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setHostSettingsOpen(false)}>{t('common.close', 'Close')}</Button>
      </DialogActions>
    </Dialog>
  );
};

interface FormProps {
  settings: HostSettings;
  percent: (value: number) => string;
  set: (patch: Partial<HostSettings>) => void;
}

const HostSettingsForm: React.FC<FormProps> = ({ settings, percent, set }) => {
  const { t } = useTranslation();
  // Value while dragging; the host's reported value is shown otherwise
  const [drag, setDrag] = React.useState<{ key: VolumeKey; value: number } | null>(null);

  const volumeSlider = (key: VolumeKey, label: string) => {
    const value = drag?.key === key ? drag.value : settings[key];
    return (
      <SettingSlider
        label={`${label}: ${percent(value)}`}
        value={Math.round(value * 100)}
        min={0}
        max={100}
        onChange={(_, v) => setDrag({ key, value: (v as number) / 100 })}
        onChangeCommitted={(_, v) => {
          setDrag(null);
          set({ [key]: (v as number) / 100 });
        }}
      />
    );
  };

  return (
    <>
      {volumeSlider('masterVolume', t('melodiq.remote_host.master_volume', 'Master volume'))}
      {volumeSlider('songVolume', t('melodiq.remote_host.song_volume', 'Song volume'))}
      {volumeSlider('vocalsVolume', t('melodiq.remote_host.vocals_volume', 'Vocals volume'))}

      <SettingToggleGroup
        title={t('melodiq.settings_panel.audio_playback_mode', 'Audio Playback Mode')}
        value={settings.audioPlaybackMode}
        options={[
          {
            value: 'separated',
            label: t('melodiq.settings_panel.mode_separated', 'Separated Stems'),
          },
          { value: 'original', label: t('melodiq.settings_panel.mode_original', 'Original Audio') },
        ]}
        onChange={(audioPlaybackMode) => set({ audioPlaybackMode })}
      />

      <SettingToggleGroup
        title={t('melodiq.settings_panel.lyrics_lines', 'Number of Lyrics Lines')}
        value={settings.lyricsLines}
        options={LINE_OPTIONS}
        onChange={(lyricsLines) => set({ lyricsLines })}
      />

      <SettingToggleGroup
        title={t('melodiq.settings_panel.lyrics_rows', 'Rows per Lyric')}
        value={settings.lyricsRows}
        options={[
          { value: 1, label: t('melodiq.settings_panel.lyrics_rows_one', '1 row') },
          { value: 2, label: t('melodiq.settings_panel.lyrics_rows_two', '2 rows') },
        ]}
        onChange={(lyricsRows) => set({ lyricsRows })}
      />

      <SettingToggleGroup
        title={t('melodiq.remote_host.lyrics_position', 'Lyrics position')}
        value={settings.lyricsPosition}
        options={[
          { value: 'bottom', label: t('melodiq.remote_host.position_bottom', 'Bottom') },
          { value: 'center', label: t('melodiq.remote_host.position_center', 'Center') },
        ]}
        onChange={(lyricsPosition) => set({ lyricsPosition })}
      />

      <SettingSwitch
        checked={settings.enableLyricsZoom}
        onChange={(enableLyricsZoom) => set({ enableLyricsZoom })}
        label={t('melodiq.settings_panel.lyrics_zoom', 'Lyrics Zoom Animation')}
      />
      <SettingSwitch
        checked={settings.showNoteLabels}
        onChange={(showNoteLabels) => set({ showNoteLabels })}
        label={t('melodiq.remote_host.note_labels', 'Show note names')}
      />
      <SettingSwitch
        checked={settings.showScoreboardQrCode}
        onChange={(showScoreboardQrCode) => set({ showScoreboardQrCode })}
        label={t('melodiq.remote_host.scoreboard_qr', 'QR code on the scoreboard')}
      />
    </>
  );
};
