import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SettingsState } from '../hooks/SettingsContext';
import { SettingSlider, SettingSwitch, SettingToggleGroup } from '../../../components/settings';
import { LYRICS_MIN_FIT_OPTIONS } from '../gameplay/logic/lyricsFit';

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
        label={`${t('melodiq.settings_panel.lyrics_scale')}: ${Math.round(scale * 100)}%`}
        description={t('melodiq.settings_panel.lyrics_scale_desc')}
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
        label={t('melodiq.settings_panel.lyrics_zoom')}
        description={t('melodiq.settings_panel.lyrics_zoom_desc')}
      />

      <SettingToggleGroup
        title={t('melodiq.settings_panel.lyrics_lines')}
        value={settings.lyricsLines ?? 2}
        options={LINE_OPTIONS}
        onChange={(val) => onUpdateSetting('lyricsLines', val)}
        description={t('melodiq.settings_panel.lyrics_lines_desc')}
      />

      <SettingToggleGroup
        title={t('melodiq.settings_panel.lyrics_rows')}
        value={settings.lyricsRows ?? 2}
        options={[
          { value: 1, label: t('melodiq.settings_panel.lyrics_rows_one') },
          { value: 2, label: t('melodiq.settings_panel.lyrics_rows_two') },
        ]}
        onChange={(val) => onUpdateSetting('lyricsRows', val)}
        description={t('melodiq.settings_panel.lyrics_rows_desc')}
      />

      <SettingToggleGroup
        title={t('melodiq.settings_panel.lyrics_min_size')}
        value={settings.lyricsMinFit ?? 0.6}
        options={LYRICS_MIN_FIT_OPTIONS.map((fit) => ({
          value: fit,
          label: `${Math.round(fit * 100)}%`,
        }))}
        onChange={(val) => onUpdateSetting('lyricsMinFit', val)}
        description={t('melodiq.settings_panel.lyrics_min_size_desc')}
      />

      <SettingToggleGroup
        title={t('melodiq.settings_panel.lyrics_position')}
        value={settings.lyricsPosition ?? 'bottom'}
        options={[
          { value: 'bottom', label: t('melodiq.settings_panel.lyrics_position_bottom') },
          { value: 'center', label: t('melodiq.settings_panel.lyrics_position_center') },
        ]}
        onChange={(val) => onUpdateSetting('lyricsPosition', val)}
        description={t('melodiq.settings_panel.lyrics_position_desc')}
      />
    </>
  );
};
