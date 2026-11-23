/**
 * Host page of a draw pot: `games/drawpot/admin/:potId` [ID: DRAWPOT-ADMIN]
 *
 * Shows the participant link (copy, share, QR), progress, the draw log (only with
 * `hostSeesResults`), the entries and the host actions.
 */
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/titleContextCore';
import { GameLayout } from '../../components/Layout/GameLayout';
import { ErrorState } from '../../components/common/ErrorState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useAdminPot } from './hooks/useAdminPot';
import { adminLink, participantLink, potPath, serverOf } from './logic/api';
import { ShareLinkCard } from './components/ShareLinkCard';
import { AdminStatus } from './components/AdminStatus';
import { AdminActions } from './components/AdminActions';
import { PotEntriesOverview } from './components/PotEntriesOverview';

export const DrawPotAdmin: React.FC = () => {
  const { potId = '' } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const a = useAdminPot(potId);
  const [confirmForget, setConfirmForget] = useState(false);
  usePageTitle(a.pot?.title ?? t('games.drawpot.title'));

  if (a.error === 'no_key' || a.error === 'forbidden')
    return (
      <GameLayout maxWidth="sm">
        <ErrorState message={t('drawpot.admin.noKey')} />
        <Box textAlign="center">
          <Button onClick={() => navigate(potPath('p', potId, serverOf(a.backend)))}>
            {t('drawpot.admin.openAsParticipant')}
          </Button>
        </Box>
      </GameLayout>
    );

  if (!a.pot)
    return a.error ? (
      <GameLayout maxWidth="sm">
        <ErrorState
          message={t(`drawpot.errors.${a.error}`, { defaultValue: t('drawpot.errors.network') })}
          onRetry={a.error === 'not_found' ? undefined : a.refresh}
        />
        {a.error === 'not_found' && (
          <Box textAlign="center">
            <Button color="error" onClick={() => setConfirmForget(true)}>
              {t('drawpot.admin.forget')}
            </Button>
          </Box>
        )}
        <ConfirmDialog
          open={confirmForget}
          title={t('drawpot.admin.forgetTitle')}
          message={t('drawpot.admin.forgetMessage')}
          confirmText={t('drawpot.admin.forgetConfirm')}
          confirmColor="error"
          onCancel={() => setConfirmForget(false)}
          onConfirm={() => {
            setConfirmForget(false);
            void a.remove();
          }}
        />
      </GameLayout>
    ) : (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );

  const link = participantLink(potId, a.backend);
  return (
    <GameLayout maxWidth="sm">
      <Stack spacing={2.5}>
        <Box>
          {a.pot.description && (
            <Typography color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
              {a.pot.description}
            </Typography>
          )}
        </Box>
        {a.error && (
          <Alert severity="warning">
            {t(`drawpot.errors.${a.error}`, { defaultValue: t('drawpot.errors.network') })}
          </Alert>
        )}
        <ShareLinkCard
          label={t('drawpot.admin.participantLink')}
          hint={t('drawpot.admin.participantLinkHint')}
          url={link}
          shareTitle={a.pot.title}
          shareText={t('drawpot.admin.shareText', { title: a.pot.title })}
          defaultQr
        />
        <AdminStatus pot={a.pot} busy={a.busy} onRefresh={a.refresh} />
        <PotEntriesOverview
          pot={a.pot}
          title={t('drawpot.admin.entries', { count: a.pot.totalEntries })}
        />
        <AdminActions pot={a.pot} busy={a.busy} onAction={a.act} onDelete={a.remove} />
        {a.adminKey && (
          <ShareLinkCard
            label={t('drawpot.admin.hostLink')}
            hint={t('drawpot.admin.hostLinkHint')}
            url={adminLink(potId, a.adminKey, a.backend)}
            shareTitle={a.pot.title}
            shareText={t('drawpot.admin.hostShareText', { title: a.pot.title })}
          />
        )}
      </Stack>
    </GameLayout>
  );
};
