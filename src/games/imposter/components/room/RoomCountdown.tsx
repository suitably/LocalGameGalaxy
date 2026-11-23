/**
 * Discussion time left in a party room, from the host's end time [ID: COMP-IMPOSTER-ROOM-COUNTDOWN]
 *
 * Each device counts down against its own clock; a few seconds of clock skew between phones is
 * accepted. The host starts the vote when the time is up.
 */
import React, { useEffect, useState } from 'react';
import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

const format = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const RoomCountdown: React.FC<{ endsAt: number; onTimeUp?: () => void }> = ({
  endsAt,
  onTimeUp,
}) => {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  const left = endsAt - now;
  useEffect(() => {
    if (left <= 0) onTimeUp?.();
  }, [left, onTimeUp]);
  return (
    <Typography variant="h3" fontWeight={800} textAlign="center" sx={{ my: 2 }}>
      {left > 0 ? format(left) : t('games.imposter.room.time_up')}
    </Typography>
  );
};
