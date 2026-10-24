import React from 'react';
import { Button, DialogActions } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface FormDialogActionsProps {
  onClose: () => void;
  onSave: () => void;
}

/** Cancel / Save footer shared by the catalogue add/edit dialogs. */
export const FormDialogActions: React.FC<FormDialogActionsProps> = ({ onClose, onSave }) => {
  const { t } = useTranslation();
  return (
    <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
      <Button onClick={onClose} color="inherit">
        {t('common.cancel', 'Abbrechen')}
      </Button>
      <Button
        onClick={onSave}
        variant="contained"
        color="primary"
        sx={{ textTransform: 'none', fontWeight: 700 }}
      >
        {t('common.save', 'Speichern')}
      </Button>
    </DialogActions>
  );
};
