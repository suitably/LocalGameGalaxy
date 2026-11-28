/**
 * Participant page of a draw pot: `games/drawpot/p/:potId` [ID: DRAWPOT-PARTICIPANT]
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import CasinoRoundedIcon from '@mui/icons-material/CasinoRounded';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/titleContextCore';
import { GameLayout } from '../../components/Layout/GameLayout';
import { ErrorState } from '../../components/common/ErrorState';
import { useParticipantPot } from './hooks/useParticipantPot';
import { DrawReveal } from './components/DrawReveal';
import { IdentityPicker } from './components/IdentityPicker';
import { MyDrawsList } from './components/MyDrawsList';
import { PotEntriesOverview } from './components/PotEntriesOverview';
import { participantStatus } from './logic/participantStatus';

export const DrawPotParticipant: React.FC = () => {
  const { potId = '' } = useParams();
  const { t } = useTranslation();
  const s = useParticipantPot(potId);
  const title = s.pot?.title ?? s.history?.title ?? t('games.drawpot.title');
  usePageTitle(title);

  if (s.loading && !s.pot && !s.history)
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );

  const status = participantStatus(s);
  const needsIdentity = s.santa && s.draws.length === 0;
  const candidates = s.pot?.entries?.map((e) => e.label) ?? [];

  return (
    <GameLayout maxWidth="sm">
      <Stack spacing={2.5}>
        <Box>
          {s.pot?.description && (
            <Typography color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
              {s.pot.description}
            </Typography>
          )}
          {s.santa && s.history?.identityLabel && (
            <Typography variant="body2" color="text.secondary">
              {t('drawpot.participant.youAre', { name: s.history.identityLabel })}
            </Typography>
          )}
        </Box>

        {s.loadError && !s.pot && (
          <ErrorState
            message={t(`drawpot.errors.${s.loadError}`, {
              defaultValue: t('drawpot.errors.network'),
            })}
            onRetry={s.loadError === 'not_found' ? undefined : s.refresh}
            dense={s.draws.length > 0}
          />
        )}

        {s.revealing && (
          <DrawReveal
            key={s.revealing.at}
            label={s.revealing.label}
            candidates={candidates}
            doneLabel={
              s.santa ? t('drawpot.participant.yourPartner') : t('drawpot.participant.youDrew')
            }
          />
        )}

        {needsIdentity && s.pot?.entries && !s.pot.closed && (
          <IdentityPicker
            entries={s.pot.entries}
            selected={s.identityId}
            onSelect={s.setIdentityId}
          />
        )}

        {s.pot && s.canDraw && (
          <Button
            size="large"
            variant="contained"
            startIcon={
              s.drawing ? <CircularProgress size={20} color="inherit" /> : <CasinoRoundedIcon />
            }
            disabled={s.drawing || (needsIdentity && !s.identityId)}
            onClick={() => void s.draw()}
            sx={{ py: 1.75, fontSize: 18, fontWeight: 800, borderRadius: 3 }}
          >
            {s.draws.length > 0
              ? t('drawpot.participant.drawAgain')
              : t('drawpot.participant.draw')}
          </Button>
        )}

        {s.drawError && (
          <Alert severity="warning">
            {t(`drawpot.errors.${s.drawError}`, { defaultValue: t('drawpot.errors.network') })}
          </Alert>
        )}

        {status && <Alert severity={status.severity}>{t(status.key, status.params ?? {})}</Alert>}

        <MyDrawsList
          draws={s.revealing ? s.draws.filter((d) => d.at !== s.revealing?.at) : s.draws}
          title={
            s.santa ? t('drawpot.participant.yourPartner') : t('drawpot.participant.yourDraws')
          }
        />

        {s.pot && <PotEntriesOverview pot={s.pot} />}
      </Stack>
    </GameLayout>
  );
};
