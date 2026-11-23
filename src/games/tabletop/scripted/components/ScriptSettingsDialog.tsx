/**
 * Table settings of a scripted card game: house rules and aids [ID: COMP-TABLETOP-SCRIPT-SETTINGS]
 *
 * One dialog for every game with options, opened from the header in the setup and while a match
 * runs. A change applies at once: in the setup to the next match, in a running match on the
 * host for every device at the table. Guests see the host's settings read-only.
 */
import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { AnyGameScript, ScriptOptions } from '../logic/scriptTypes';
import { ScriptOptionSwitches } from './ScriptOptionSwitches';

interface ScriptSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  script: AnyGameScript;
  value: ScriptOptions;
  /** Missing: read-only (a guest in a party room). */
  onChange?: (next: ScriptOptions) => void;
  running: boolean;
  /** A party room: changes reach every device. */
  shared: boolean;
}

export const ScriptSettingsDialog: React.FC<ScriptSettingsDialogProps> = ({
  open,
  onClose,
  script,
  value,
  onChange,
  running,
  shared,
}) => {
  const { t } = useTranslation();
  const k = (key: string) => t(`games.tabletop.scripted.settings.${key}`);
  let note = k('nextMatch');
  if (!onChange) note = k('hostOnly');
  else if (running) note = shared ? k('appliesAll') : k('appliesNow');
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{k('title')}</DialogTitle>
      <DialogContent>
        <ScriptOptionSwitches script={script} value={value} onChange={onChange} />
        <Typography variant="caption" color="text.secondary">
          {note}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
};
