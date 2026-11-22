/**
 * The host picks the scoring rules of a Kniffel party game [ID: COMP-KNIFFEL-RULES-PICKER]
 *
 * Shown to the host before the first score and after the game; the choice is kept on the
 * device for the next game (`STORAGE_KEYS.KNIFFEL_ROOM_RULES`).
 */
import React from 'react';
import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { KniffelRules } from '../logic/types';
import { saveKniffelRoomRules } from './kniffelRulesStorage';

export const KniffelRulesPicker: React.FC<{
  rules: KniffelRules;
  onChange: (rules: KniffelRules) => void;
}> = ({ rules, onChange }) => {
  const { t } = useTranslation();
  return (
    <Box textAlign="center" mb={1.5}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={rules}
        aria-label={t('games.kniffel.rules_label')}
        onChange={(_, value: KniffelRules | null) => {
          if (!value) return;
          saveKniffelRoomRules(value);
          onChange(value);
        }}
      >
        <ToggleButton value="kniffel" sx={{ minHeight: 44, px: 2 }}>
          {t('games.kniffel.rules_kniffel')}
        </ToggleButton>
        <ToggleButton value="international" sx={{ minHeight: 44, px: 2 }}>
          {t('games.kniffel.rules_international')}
        </ToggleButton>
      </ToggleButtonGroup>
      {rules === 'international' && (
        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
          {t('games.kniffel.rules_hint')}
        </Typography>
      )}
    </Box>
  );
};
