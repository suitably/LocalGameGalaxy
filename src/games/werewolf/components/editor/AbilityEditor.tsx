import React from 'react';
import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteRounded';
import { useTranslation } from 'react-i18next';
import type { Ability, NightAction } from '../../logic/types';

const ABILITY_TYPES: { value: NightAction['type']; key: string; fallback: string }[] = [
  { value: 'KILL', key: 'kill', fallback: 'Kill' },
  { value: 'HEAL', key: 'heal', fallback: 'Heal' },
  { value: 'PROTECT', key: 'protect', fallback: 'Protect' },
  { value: 'INFECT', key: 'infect', fallback: 'Infect' },
  { value: 'CHECK_ROLE', key: 'check_role', fallback: 'Check Role' },
  { value: 'LINK_LOVERS', key: 'link_lovers', fallback: 'Link Lovers' },
  { value: 'GIVE_EGG', key: 'give_egg', fallback: 'Give Item' },
  { value: 'CHOOSE_CAMP', key: 'choose_camp', fallback: 'Choose Camp' },
  { value: 'STEAL_ROLE', key: 'steal_role', fallback: 'Steal Role' },
];

const TIMINGS: { value: Ability['timing']; key: string; fallback: string }[] = [
  { value: 'EVERY_NIGHT', key: 'every_night', fallback: 'Every Night' },
  { value: 'FIRST_NIGHT', key: 'first_night', fallback: 'First Night Only' },
  { value: 'ROUND_NUMBER', key: 'round_number', fallback: 'Specific Round' },
];

interface AbilityEditorProps {
  ability: Ability;
  index: number;
  onChange: (updates: Partial<Ability>) => void;
  onRemove: () => void;
}

export const AbilityEditor: React.FC<AbilityEditorProps> = ({
  ability,
  index,
  onChange,
  onRemove,
}) => {
  const { t } = useTranslation();
  const typeLabel = t('games.werewolf.ui.editor.ability_type', 'Action');
  const timingLabel = t('games.werewolf.ui.editor.timing', 'Timing');

  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
      <Box display="flex" flexDirection="column" gap={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption">#{index + 1}</Typography>
          <IconButton size="small" onClick={onRemove} aria-label={t('common.delete', 'Delete')}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
        <FormControl fullWidth size="small">
          <InputLabel>{typeLabel}</InputLabel>
          <Select
            value={ability.type}
            label={typeLabel}
            onChange={(e) => onChange({ type: e.target.value as NightAction['type'] })}
          >
            {ABILITY_TYPES.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {t(`games.werewolf.ui.editor.ability_types.${o.key}`, o.fallback)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box display="flex" gap={2}>
          <FormControl fullWidth size="small">
            <InputLabel>{timingLabel}</InputLabel>
            <Select
              value={ability.timing}
              label={timingLabel}
              onChange={(e) => onChange({ timing: e.target.value as Ability['timing'] })}
            >
              {TIMINGS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {t(`games.werewolf.ui.editor.timing_options.${o.key}`, o.fallback)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={t('games.werewolf.editor.targets', 'Targets')}
            type="number"
            size="small"
            value={ability.targetCount}
            onChange={(e) => onChange({ targetCount: parseInt(e.target.value) || 1 })}
            sx={{ width: 100 }}
          />
        </Box>
      </Box>
    </Paper>
  );
};
