import React from 'react';
import { Checkbox, FormControl, InputLabel, ListItemText, MenuItem, Select } from '@mui/material';

export interface MultiFilterSelectProps {
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  minWidth: number;
  maxWidth: number;
}

/** Multi-select dropdown with checkboxes for a search facet (genre, edition, language…). */
export const MultiFilterSelect: React.FC<MultiFilterSelectProps> = ({
  label,
  options,
  value,
  onChange,
  minWidth,
  maxWidth,
}) => (
  <FormControl size="small" sx={{ minWidth, maxWidth }}>
    <InputLabel>{label}</InputLabel>
    <Select
      multiple
      value={value}
      label={label}
      onChange={(e) => {
        const next = e.target.value;
        onChange(typeof next === 'string' ? next.split(',') : next);
      }}
      renderValue={(selected) => selected.join(', ')}
      sx={{ borderRadius: 999 }}
    >
      {options.map((option) => (
        <MenuItem key={option} value={option}>
          <Checkbox checked={value.indexOf(option) > -1} />
          <ListItemText primary={option} />
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);
