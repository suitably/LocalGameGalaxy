/**
 * Feedback while a short join link (QR code) loads its game from the mailbox [ID: GUESSART-JOIN-NOTICE]
 */
import React from 'react';
import { Alert, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { JoinLinkStatus } from '../hooks/useGuessArtJoinLink';

export const JoinLinkNotice: React.FC<{ status: JoinLinkStatus }> = ({ status }) => {
  const { t } = useTranslation();
  if (status === 'idle') return null;
  const loading = status === 'loading';
  return (
    <Alert
      severity={loading ? 'info' : 'warning'}
      icon={loading ? <CircularProgress size={20} /> : undefined}
      role="status"
      sx={{ m: 2, borderRadius: 2 }}
    >
      {loading
        ? t('guessart.joinLoading', 'Spiel wird geladen …')
        : t(
            'guessart.joinFailed',
            'Das Spiel konnte nicht geladen werden. Prüfe die Internetverbindung und scanne den Code erneut – oder lass dir den Link schicken.',
          )}
    </Alert>
  );
};
