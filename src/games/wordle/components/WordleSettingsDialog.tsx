/**
 * WordleSettingsDialog.tsx - Game settings ("Only dictionary words").
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormHelperText,
  Switch,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

export const WordleSettingsDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  dictionaryOnly: boolean;
  onDictionaryOnlyChange: (value: boolean) => void;
}> = ({ open, onClose, dictionaryOnly, onDictionaryOnlyChange }) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('wordle.settings.title', 'Einstellungen')}</DialogTitle>
      <DialogContent>
        <FormControlLabel
          control={
            <Switch
              checked={dictionaryOnly}
              onChange={(e) => onDictionaryOnlyChange(e.target.checked)}
            />
          }
          label={t('wordle.settings.dictionary_only', 'Nur Wörterbuch-Wörter')}
        />
        <FormHelperText>
          {t(
            'wordle.settings.dictionary_only_hint',
            'Tipps müssen ein bekanntes Wort sein. Ungültige Wörter kosten keinen Versuch.',
          )}
        </FormHelperText>
      </DialogContent>
    </Dialog>
  );
};
