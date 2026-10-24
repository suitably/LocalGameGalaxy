import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import { useTranslation } from 'react-i18next';
import type { StoryModifierSettings } from '../types';

interface StoryModifierCardProps {
  modifiers: StoryModifierSettings;
  onUpdateModifier: <K extends keyof StoryModifierSettings>(
    key: K,
    patch: Partial<StoryModifierSettings[K]>,
  ) => void;
}

interface ModifierOptionProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  action?: React.ReactNode;
}

const TIME_LIMITS = [30, 45, 60, 90] as const;

const ModifierOption: React.FC<ModifierOptionProps> = ({
  title,
  description,
  checked,
  onChange,
  action,
}) => (
  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <FormControlLabel
        control={
          <Checkbox
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            sx={{ color: 'piece.pink', '&.Mui-checked': { color: 'piece.pink' } }}
          />
        }
        label={<Typography fontWeight={700}>{title}</Typography>}
      />
      {action}
    </Stack>
    <Typography variant="caption" display="block" sx={{ color: 'text.secondary', ml: 4 }}>
      {description}
    </Typography>
  </Box>
);

export const StoryModifierCard: React.FC<StoryModifierCardProps> = ({
  modifiers,
  onUpdateModifier,
}) => {
  const { t } = useTranslation();

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <TuneRoundedIcon sx={{ color: 'piece.pink' }} />
          <Typography variant="subtitle1" fontWeight={700}>
            {t('storyteller.modifiersTitle', 'Modifikatoren (Baukasten)')}
          </Typography>
        </Stack>

        <Stack spacing={2}>
          <ModifierOption
            title={t('storyteller.modBlindTitle', 'Blind Mode')}
            description={t(
              'storyteller.modBlindDesc',
              'Spieler sehen nur die letzten 10 Wörter des vorherigen Spielers, nicht die ganze Geschichte.',
            )}
            checked={modifiers.blindMode.enabled}
            onChange={(enabled) => onUpdateModifier('blindMode', { enabled })}
          />
          <ModifierOption
            title={t('storyteller.modTimeTitle', 'Time Attack')}
            description={t(
              'storyteller.modTimeDesc',
              'Ein Timer läuft pro Zug ab. Nach Ablauf der Zeit wird der Text automatisch übermittelt.',
            )}
            checked={modifiers.timeAttack.enabled}
            onChange={(enabled) => onUpdateModifier('timeAttack', { enabled })}
            action={
              modifiers.timeAttack.enabled && (
                <Select
                  size="small"
                  value={modifiers.timeAttack.timeLimitSeconds}
                  onChange={(e) =>
                    onUpdateModifier('timeAttack', { timeLimitSeconds: Number(e.target.value) })
                  }
                  sx={{ height: 32, fontSize: '0.8rem' }}
                >
                  {TIME_LIMITS.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}s
                    </MenuItem>
                  ))}
                </Select>
              )
            }
          />
          <ModifierOption
            title={t('storyteller.modRouletteTitle', 'Word Roulette')}
            description={t(
              'storyteller.modRouletteDesc',
              'Das System zieht pro Zug 3 zufällige Pflichtwörter, die im Text vorkommen müssen, bevor man absenden kann.',
            )}
            checked={modifiers.wordRoulette.enabled}
            onChange={(enabled) => onUpdateModifier('wordRoulette', { enabled })}
          />
        </Stack>
      </CardContent>
    </Card>
  );
};
