import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SettingsState } from '../hooks/SettingsContext';
import { SettingSlider, SettingSwitch, SettingToggleGroup } from './GameSettingsControls';

interface LyricsSettingsSectionProps {
  settings: SettingsState;
  onUpdateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}

const LINE_OPTIONS = [0, 1, 2, 3].map((n) => ({ value: n, label: String(n) }));

/** Lyrics size, zoom animation, line count and position. */
export const LyricsSettingsSection: React.FC<LyricsSettingsSectionProps> = ({
  settings,
  onUpdateSetting,
}) => {
  const { t } = useTranslation();
  const scale = settings.lyricsScale ?? 1.0;
  return (
    <>
      <SettingSlider
        label={`${t('melodiq.settings_panel.lyrics_scale', 'Lyrics Size')}: ${Math.round(scale * 100)}%`}
        description={t(
          'melodiq.settings_panel.lyrics_scale_desc',
          'Adjust the size of the lyrics on the main screen.',
        )}
        value={scale}
        onChange={(_, val) => onUpdateSetting('lyricsScale', val as number)}
        min={0.5}
        max={3.0}
        step={0.1}
        marks
        valueLabelDisplay="auto"
      />

      <SettingSwitch
        checked={settings.enableLyricsZoom ?? false}
        onChange={(checked) => onUpdateSetting('enableLyricsZoom', checked)}
        label={t('melodiq.settings_panel.lyrics_zoom', 'Lyrics Zoom Animation')}
        description={t(
          'melodiq.settings_panel.lyrics_zoom_desc',
          'Zoom and glow active lyric syllables during singing. Disable for simple color highlighting.',
        )}
      />

      <SettingToggleGroup
        title={t('melodiq.settings_panel.lyrics_lines', 'Number of Lyrics Lines')}
        value={settings.lyricsLines ?? 2}
        options={LINE_OPTIONS}
        onChange={(val) => onUpdateSetting('lyricsLines', val)}
        description={t(
          'melodiq.settings_panel.lyrics_lines_desc',
          'Choose how many lines of lyrics to display.',
        )}
      />

      <SettingToggleGroup
        title={t('melodiq.settings_panel.lyrics_position', 'Lyrics Position (No Singers)')}
        value={settings.lyricsPosition ?? 'bottom'}
        options={[
          { value: 'bottom', label: t('melodiq.settings_panel.lyrics_position_bottom', 'Bottom') },
          { value: 'center', label: t('melodiq.settings_panel.lyrics_position_center', 'Center') },
        ]}
        onChange={(val) => onUpdateSetting('lyricsPosition', val)}
        description={t(
          'melodiq.settings_panel.lyrics_position_desc',
          'Choose whether lyrics appear at the bottom or in the center when no singers are active.',
        )}
      />
    </>
  );
};
