import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { SettingsState } from '../hooks/SettingsContext';
import { CustomLayoutsEditor } from './CustomLayoutsEditor';
import { AutoplaySettings } from './AutoplaySettings';
import { AudioSettingsSection } from './AudioSettingsSection';
import { LyricsSettingsSection } from './LyricsSettingsSection';
import { FallbackBackgroundField } from './FallbackBackgroundField';
import { SettingSlider, SettingSwitch, SettingToggleGroup } from './GameSettingsControls';

interface GameSettingsPanelProps {
  settings: SettingsState;
  onUpdateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}

export const GameSettingsPanel: React.FC<GameSettingsPanelProps> = ({
  settings,
  onUpdateSetting,
}) => {
  const { t } = useTranslation();
  const p = (key: string) => t(`melodiq.settings_panel.${key}`);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {p('title')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <CustomLayoutsEditor
          layouts={settings.customLayouts}
          onChange={(layouts) => onUpdateSetting('customLayouts', layouts)}
        />

        <SettingToggleGroup
          pill
          title={p('default_view')}
          ariaLabel="default view mode"
          value={settings.defaultViewMode || 'list'}
          options={[
            { value: 'list', label: p('list_view') },
            { value: 'grid', label: p('grid_view') },
          ]}
          onChange={(val) => onUpdateSetting('defaultViewMode', val)}
          description={p('default_view_desc')}
        />

        <AutoplaySettings
          noPlayersDelay={settings.autoplayNoPlayersDelay}
          withPlayersDelay={settings.autoplayWithPlayersDelay}
          onNoPlayersDelayChange={(s) => onUpdateSetting('autoplayNoPlayersDelay', s)}
          onWithPlayersDelayChange={(s) => onUpdateSetting('autoplayWithPlayersDelay', s)}
        />

        <SettingToggleGroup
          pill
          title={p('default_click')}
          ariaLabel="default click action"
          value={settings.defaultSongClickAction}
          options={[
            { value: 'play_now', label: p('play_now') },
            { value: 'play_next', label: p('play_next') },
            { value: 'add_end', label: p('add_queue') },
          ]}
          onChange={(val) => onUpdateSetting('defaultSongClickAction', val)}
          description={p('default_click_desc')}
        />

        <SettingToggleGroup
          pill
          title={p('card_size')}
          ariaLabel="card size"
          value={settings.cardSize}
          options={[
            { value: 'small', label: p('small') },
            { value: 'medium', label: p('medium') },
            { value: 'large', label: p('large') },
            { value: 'custom', label: p('custom') },
          ]}
          onChange={(val) => onUpdateSetting('cardSize', val)}
        />
        {settings.cardSize === 'custom' && (
          <SettingSlider
            label={`${p('max_items')}: ${settings.customTarget}`}
            description={p('max_items_desc')}
            value={settings.customTarget}
            onChange={(_, val) => onUpdateSetting('customTarget', val as number)}
            min={1}
            max={12}
            step={1}
            marks
            valueLabelDisplay="auto"
          />
        )}

        <SettingSlider
          label={`${p('golden_multiplier')}: ${settings.goldenNoteMultiplier}x`}
          description={p('golden_multiplier_desc')}
          value={settings.goldenNoteMultiplier}
          onChange={(_, val) => onUpdateSetting('goldenNoteMultiplier', val as number)}
          min={1.0}
          max={5.0}
          step={0.5}
          marks
          valueLabelDisplay="auto"
        />

        <LyricsSettingsSection settings={settings} onUpdateSetting={onUpdateSetting} />

        <AudioSettingsSection settings={settings} onUpdateSetting={onUpdateSetting} />

        <SettingSwitch
          checked={settings.hideBackgroundVideo}
          onChange={(checked) => onUpdateSetting('hideBackgroundVideo', checked)}
          label={t('melodiq.settings_panel.hide_video', 'Hide Background Video')}
        />

        <FallbackBackgroundField
          value={settings.fallbackBackgroundUrl || ''}
          onChange={(url) => onUpdateSetting('fallbackBackgroundUrl', url)}
        />

        <SettingSwitch
          checked={settings.showNoteLabels}
          onChange={(checked) => onUpdateSetting('showNoteLabels', checked)}
          label={p('show_pitch')}
        />
        <SettingSwitch
          checked={settings.showScoreboardQrCode}
          onChange={(checked) => onUpdateSetting('showScoreboardQrCode', checked)}
          label={t('melodiq.settings_panel.show_scoreboard_qr', 'Show QR Code on Score Screen')}
        />

        <Accordion sx={{ mt: 2, '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">{p('dev_options')}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ display: 'flex', flexDirection: 'column' }}>
            {(
              [
                ['showDebugOverlay', 'show_debug'],
                ['showDevSlider', 'show_dev_slider'],
                ['showVideoErrors', 'show_video_errors'],
              ] as const
            ).map(([key, labelKey]) => (
              <FormControlLabel
                key={key}
                control={
                  <Switch
                    checked={settings[key]}
                    onChange={(e) => onUpdateSetting(key, e.target.checked)}
                  />
                }
                label={p(labelKey)}
              />
            ))}
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  );
};
