import React, { useState } from 'react';
import { Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../common/ConfirmDialog';

export interface SettingsResetButtonProps {
  onReset: () => void;
  label?: string;
  confirmMessage?: string;
}

/** "Reset to defaults" button that asks for confirmation before calling `onReset`. */
export const SettingsResetButton: React.FC<SettingsResetButtonProps> = ({
  onReset,
  label,
  confirmMessage,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const text = label ?? t('settings.reset.button');
  return (
    <>
      <Button variant="outlined" color="inherit" onClick={() => setOpen(true)}>
        {text}
      </Button>
      <ConfirmDialog
        open={open}
        title={text}
        message={confirmMessage ?? t('settings.reset.confirm')}
        confirmColor="warning"
        onConfirm={() => {
          setOpen(false);
          onReset();
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
};
