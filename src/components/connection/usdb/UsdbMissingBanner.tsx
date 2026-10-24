import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Typography } from '@mui/material';
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';

export const UsdbMissingBanner: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Alert
      severity="warning"
      icon={<VpnKeyRoundedIcon fontSize="inherit" />}
      sx={{ mb: 2, borderRadius: 2 }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        {t('server.usdb.missing_title', 'USDB-Zugangsdaten erforderlich')}
      </Typography>
      <Typography variant="body2">
        {t(
          'server.usdb.missing_desc',
          'Für die Online-Suche und das Herunterladen von Songs aus der UltraStar DB müssen Benutzername und Passwort hinterlegt werden.',
        )}
      </Typography>
    </Alert>
  );
};
