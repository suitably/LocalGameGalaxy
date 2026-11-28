import { Button, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { updateStrumSetting, type StrumMode, type StrumSetting } from '../logic/strumDirection';

interface StrumSettingsProps {
  setting: StrumSetting | undefined;
  /** Played bars of the song (bar numbers run from 1 to this). */
  barCount: number;
  onChange: (next: StrumSetting | undefined) => void;
}

const MODES: StrumMode[] = ['auto', 'down', 'up'];
const ARROW: Partial<Record<StrumMode, string>> = { down: '↓', up: '↑' };

/** Strum direction of one guitar part (#634): song-wide and per bar, in the parts dialog. */
export function StrumSettings({ setting, barCount, onChange }: StrumSettingsProps) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts ?? {});
  const [bar, setBar] = useState('');
  const [barMode, setBarMode] = useState<StrumMode>('down');
  const barNo = Number(bar);
  const validBar = Number.isInteger(barNo) && barNo >= 1 && barNo <= barCount;
  const label = (m: StrumMode) => k(`strum_${m}`);

  return (
    <Stack spacing={1} sx={{ pl: 1 }}>
      <TextField
        select
        size="small"
        label={k('strum_label')}
        value={setting?.mode ?? 'auto'}
        onChange={(e) =>
          onChange(updateStrumSetting(setting, { mode: e.target.value as StrumMode }))
        }
      >
        {MODES.map((m) => (
          <MenuItem key={m} value={m}>
            {label(m)}
          </MenuItem>
        ))}
      </TextField>
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          size="small"
          type="number"
          label={k('strum_bar')}
          value={bar}
          onChange={(e) => setBar(e.target.value)}
          slotProps={{ htmlInput: { min: 1, max: barCount } }}
          sx={{ width: 90 }}
        />
        <TextField
          select
          size="small"
          label={k('strum_bar_mode')}
          value={barMode}
          onChange={(e) => setBarMode(e.target.value as StrumMode)}
          sx={{ flex: 1 }}
        >
          {MODES.map((m) => (
            <MenuItem key={m} value={m}>
              {label(m)}
            </MenuItem>
          ))}
        </TextField>
        <Button
          disabled={!validBar}
          onClick={() => {
            onChange(updateStrumSetting(setting, { bar: barNo, barMode }));
            setBar('');
          }}
        >
          {k('strum_bar_set')}
        </Button>
      </Stack>
      {setting?.bars && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {Object.entries(setting.bars)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([no, mode]) => (
              <Chip
                key={no}
                size="small"
                label={k('strum_bar_chip', { bar: no, mode: ARROW[mode] ?? label(mode) })}
                onDelete={() => onChange(updateStrumSetting(setting, { bar: Number(no) }))}
              />
            ))}
        </Stack>
      )}
      <Typography variant="caption" color="text.secondary">
        {k('strum_hint')}
      </Typography>
    </Stack>
  );
}
