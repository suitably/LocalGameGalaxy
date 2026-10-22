import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { StageInputSource } from '../useStageInput';

interface InputSourcePickerProps {
  value: StageInputSource;
  midiCount: number;
  onChange: (source: StageInputSource) => void;
}

export function InputSourcePicker({ value, midiCount, onChange }: InputSourcePickerProps) {
  const { t } = useTranslation();
  const k = (key: string) => t(`games.melodiq_notes.stage.${key}`);
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={value}
      aria-label={k('input')}
      onChange={(_, v: StageInputSource | null) => v && onChange(v)}
    >
      <ToggleButton value="keys">{k('input_keys')}</ToggleButton>
      <Tooltip title={midiCount ? '' : k('midi_none')}>
        <span>
          <ToggleButton
            value="midi"
            selected={value === 'midi'}
            disabled={!midiCount}
            onChange={() => onChange('midi')}
          >
            {k('input_midi')}
          </ToggleButton>
        </span>
      </Tooltip>
      <ToggleButton value="mic">{k('input_mic')}</ToggleButton>
    </ToggleButtonGroup>
  );
}
