import React from 'react';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { InvitePlayersButton } from '../../../features/party/components/InvitePlayersButton';

/** Setup header: play live in a party room, or ("Play over days") with the players below. */
export const PlayModeCard: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" fontWeight={800}>
            {t('guessart.liveTitle', 'Live mit anderen Geräten')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(
              'guessart.liveDesc',
              'Alle sind gleichzeitig dabei: Mitspieler in der Lobby einladen, der Host startet.',
            )}
          </Typography>
          <InvitePlayersButton game="guessart" />
          <Typography variant="body2" color="text.secondary">
            {t(
              'guessart.overDaysDesc',
              'Über Tage spielen: Mitspieler unten eintragen und jedem einen eigenen Link schicken.',
            )}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};
