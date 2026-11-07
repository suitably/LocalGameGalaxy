import React from 'react';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { InvitePlayersButton } from '../../../features/party/components/InvitePlayersButton';

/** Lobby header: write live in a party room, or ("Play over days") with the players below. */
export const StoryPlayModeCard: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" fontWeight={800}>
            {t('storyteller.liveTitle', 'Live auf mehreren Geräten')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(
              'storyteller.liveDesc',
              'Alle schreiben nacheinander am selben Abend: Mitspieler in die Lobby einladen, der Host startet.',
            )}
          </Typography>
          <InvitePlayersButton game="storyteller" />
          <Typography variant="body2" color="text.secondary">
            {t(
              'storyteller.overDaysDesc',
              'Über Tage spielen: Mitspieler unten eintragen und jedem einen eigenen Link schicken.',
            )}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};
