import React from 'react';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';

interface SynonymLanguageToggleProps {
  value: string;
  onChange: (lang: string) => void;
}

const LANGS = ['de', 'en'] as const;

/** Compact DE/EN switch with a language icon (replaces the former flag emoji buttons). */
export const SynonymLanguageToggle: React.FC<SynonymLanguageToggleProps> = ({
  value,
  onChange,
}) => (
  <Box display="flex" alignItems="center" gap={0.5}>
    <LanguageRoundedIcon fontSize="small" color="action" />
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_, next: string | null) => next && onChange(next)}
    >
      {LANGS.map((lang) => (
        <ToggleButton
          key={lang}
          value={lang}
          sx={{ px: 1, py: 0.25, fontSize: '0.75rem', fontWeight: 700 }}
        >
          {lang.toUpperCase()}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  </Box>
);
