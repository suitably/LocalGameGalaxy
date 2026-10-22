/**
 * Short notice that players joined from another device [ID: MOD-PLAYER-JOINED-SNACKBAR]
 */
import React from 'react';
import { Alert, Snackbar } from '@mui/material';
import { useTranslation } from 'react-i18next';

export const PlayerJoinedSnackbar: React.FC<{ names: string[]; onClose: () => void }> = ({
  names,
  onClose,
}) => {
  const { t } = useTranslation();
  return (
    <Snackbar
      open={names.length > 0}
      autoHideDuration={5000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert onClose={onClose} severity="success" variant="filled" sx={{ width: '100%' }}>
        {t('common.playerJoined', '{{names}} ist beigetreten', { names: names.join(', ') })}
      </Alert>
    </Snackbar>
  );
};
