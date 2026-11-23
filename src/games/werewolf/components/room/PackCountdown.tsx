/**
 * Seconds left for the wolves to agree (game device's clock) [ID: GAME-WEREWOLF-PACK-COUNTDOWN]
 */
import React, { useEffect, useState } from 'react';
import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export const PackCountdown: React.FC<{ endsAt: number }> = ({ endsAt }) => {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.ceil((endsAt - now) / 1000));
  return (
    <Typography variant="body2" color="warning.main" gutterBottom role="timer">
      {t('games.werewolf.room.pack_time_left', { count: seconds })}
    </Typography>
  );
};
