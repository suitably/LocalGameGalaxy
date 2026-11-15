/**
 * Draw pot settings: mode, removal, draws per person, visibility [ID: DRAWPOT-SETTINGS-FIELDS]
 */
import React from 'react';
import {
  Box,
  Card,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { CreatePotForm } from '../hooks/useCreatePotForm';

const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}> = ({ checked, onChange, label, hint }) => (
  <FormControlLabel
    sx={{ alignItems: 'flex-start', mx: 0, gap: 1 }}
    control={<Switch checked={checked} onChange={(e) => onChange(e.target.checked)} />}
    label={
      <Box pt={0.75}>
        <Typography fontWeight={600}>{label}</Typography>
        <Typography variant="body2" color="text.secondary">
          {hint}
        </Typography>
      </Box>
    }
  />
);

export const PotSettingsFields: React.FC<{ form: CreatePotForm }> = ({ form }) => {
  const { t } = useTranslation();
  const santa = form.mode === 'secret-santa';
  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
      <Stack spacing={2}>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={form.mode}
          onChange={(_, v) => v && form.setMode(v)}
          aria-label={t('drawpot.settings.mode')}
        >
          <ToggleButton value="pot">{t('drawpot.settings.modePot')}</ToggleButton>
          <ToggleButton value="secret-santa">{t('drawpot.settings.modeSanta')}</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="body2" color="text.secondary">
          {santa ? t('drawpot.settings.modeSantaHint') : t('drawpot.settings.modePotHint')}
        </Typography>
        {!santa && (
          <>
            <Toggle
              checked={form.removeDrawn}
              onChange={form.setRemoveDrawn}
              label={t('drawpot.settings.removeDrawn')}
              hint={
                form.removeDrawn
                  ? t('drawpot.settings.removeDrawnOn')
                  : t('drawpot.settings.removeDrawnOff')
              }
            />
            <Toggle
              checked={form.multiDraw}
              onChange={form.setMultiDraw}
              label={t('drawpot.settings.multiDraw')}
              hint={t('drawpot.settings.multiDrawHint')}
            />
            {form.multiDraw && (
              <Stack direction="row" spacing={2} alignItems="center" pl={7}>
                <TextField
                  type="number"
                  size="small"
                  label={t('drawpot.settings.maxDraws')}
                  value={form.maxDraws ?? ''}
                  disabled={form.maxDraws === null}
                  onChange={(e) =>
                    form.setMaxDraws(Math.max(1, Math.min(500, Number(e.target.value) || 1)))
                  }
                  slotProps={{ htmlInput: { min: 1, max: 500 } }}
                  sx={{ width: 140 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={form.maxDraws === null}
                      onChange={(e) => form.setMaxDraws(e.target.checked ? null : 3)}
                    />
                  }
                  label={t('drawpot.settings.unlimited')}
                />
              </Stack>
            )}
            <Toggle
              checked={form.showEntries}
              onChange={form.setShowEntries}
              label={t('drawpot.settings.showEntries')}
              hint={t('drawpot.settings.showEntriesHint')}
            />
          </>
        )}
        <Toggle
          checked={form.hostSeesResults}
          onChange={form.setHostSeesResults}
          label={t('drawpot.settings.hostSeesResults')}
          hint={t('drawpot.settings.hostSeesResultsHint')}
        />
      </Stack>
    </Card>
  );
};
