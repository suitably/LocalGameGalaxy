import React from 'react';
import {
  Box,
  Typography,
  Slider,
  Switch,
  FormControlLabel,
  ToggleButton,
  ToggleButtonGroup,
  type SliderProps,
} from '@mui/material';

const selectedToggleSx = {
  '& .MuiToggleButton-root': {
    '&.Mui-selected, &.Mui-selected:hover': {
      bgcolor: 'primary.main',
      color: 'primary.contrastText',
    },
  },
} as const;

interface SettingToggleGroupProps<T extends string | number> {
  title?: string;
  ariaLabel?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  description?: string;
  /** Round pill buttons instead of the default rectangular ones. */
  pill?: boolean;
}

/** Exclusive toggle button group with optional heading and description. */
export function SettingToggleGroup<T extends string | number>({
  title,
  ariaLabel,
  value,
  options,
  onChange,
  description,
  pill,
}: SettingToggleGroupProps<T>) {
  return (
    <Box sx={{ mt: 2 }}>
      {title && (
        <Typography variant="subtitle2" gutterBottom>
          {title}
        </Typography>
      )}
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(_, next: T | null) => {
          if (next !== null) onChange(next);
        }}
        aria-label={ariaLabel ?? title}
        size="small"
        fullWidth
        sx={{
          ...selectedToggleSx,
          ...(pill && { borderRadius: 999 }),
        }}
      >
        {options.map((option) => (
          <ToggleButton
            key={option.value}
            value={option.value}
            sx={pill ? { borderRadius: 999 } : undefined}
          >
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {description && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {description}
        </Typography>
      )}
    </Box>
  );
}

interface SettingSliderProps extends Omit<SliderProps, 'sx'> {
  label: string;
  description?: string;
}

/** Slider with a label line above and an optional description below. */
export const SettingSlider: React.FC<SettingSliderProps> = ({ label, description, ...slider }) => (
  <Box sx={{ mt: 2 }}>
    <Typography gutterBottom sx={{ fontVariantNumeric: 'tabular-nums' }}>
      {label}
    </Typography>
    <Slider {...slider} sx={{ width: '100%' }} />
    {description && (
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        {description}
      </Typography>
    )}
  </Box>
);

interface SettingSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

/** Labelled switch with an optional description line. */
export const SettingSwitch: React.FC<SettingSwitchProps> = ({
  checked,
  onChange,
  label,
  description,
}) => (
  <Box>
    <FormControlLabel
      control={<Switch checked={checked} onChange={(e) => onChange(e.target.checked)} />}
      label={label}
    />
    {description && (
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
        {description}
      </Typography>
    )}
  </Box>
);
