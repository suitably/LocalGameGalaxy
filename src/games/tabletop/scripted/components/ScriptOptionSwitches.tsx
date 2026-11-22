/**
 * The table settings a script offers (house rules, aids), in the setup and the settings dialog [ID: COMP-TABLETOP-SCRIPT-OPTIONS]
 */
import React from 'react';
import { FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { optionOn, type AnyGameScript, type ScriptOptions } from '../logic/scriptTypes';

interface ScriptOptionSwitchesProps {
  script: AnyGameScript;
  value: ScriptOptions;
  /** Missing: the switches are shown disabled. */
  onChange?: (next: ScriptOptions) => void;
}

export const ScriptOptionSwitches: React.FC<ScriptOptionSwitchesProps> = ({
  script,
  value,
  onChange,
}) => {
  const { t } = useTranslation();
  if (!script.options?.length) return null;
  return (
    <Stack gap={0.5} sx={{ mb: 2 }}>
      {script.options.map((option) => (
        <div key={option.id}>
          <FormControlLabel
            control={
              <Switch
                checked={optionOn(script.options, value, option.id)}
                disabled={!onChange}
                onChange={(e) => onChange?.({ ...value, [option.id]: e.target.checked })}
              />
            }
            label={t(`games.tabletop.scripted.${option.label}`)}
          />
          {option.hint && (
            <Typography variant="body2" color="text.secondary">
              {t(`games.tabletop.scripted.${option.hint}`)}
            </Typography>
          )}
        </div>
      ))}
    </Stack>
  );
};
