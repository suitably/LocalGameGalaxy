/**
 * Short shuffle before the drawn result shows [ID: DRAWPOT-REVEAL]
 *
 * Cycles through the pot's labels for about a second, then lands on the result. With reduced
 * motion the result shows at once.
 */
import React, { useEffect, useState } from 'react';
import { Box, Card, Typography, useMediaQuery } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { transitionOf } from '../../../lib/motion';

const SHUFFLE_MS = 1200;
const TICK_MS = 80;

interface DrawRevealProps {
  label: string;
  /** Labels to flicker through; falls back to question marks. */
  candidates: string[];
  /** Overline once the result shows. */
  doneLabel: string;
}

export const DrawReveal: React.FC<DrawRevealProps> = ({ label, candidates, doneLabel }) => {
  const { t } = useTranslation();
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [shown, setShown] = useState(reduced ? label : '?');
  const [done, setDone] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    const pool = candidates.length > 1 ? candidates : ['?', '??', '???'];
    let i = 0;
    const tick = setInterval(() => setShown(pool[i++ % pool.length]), TICK_MS);
    const stop = setTimeout(() => {
      clearInterval(tick);
      setShown(label);
      setDone(true);
    }, SHUFFLE_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(stop);
    };
    // runs once per reveal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label]);

  return (
    <Card
      variant="outlined"
      aria-live="polite"
      sx={{
        p: 3,
        borderRadius: 4,
        textAlign: 'center',
        borderColor: done ? 'primary.main' : 'divider',
        borderWidth: 2,
        transition: transitionOf(['border-color', 'transform'], 'standard', 'bounce'),
        transform: done ? 'scale(1)' : 'scale(0.97)',
      }}
    >
      <Typography variant="overline" color="text.secondary">
        {done ? doneLabel : t('drawpot.participant.shuffling')}
      </Typography>
      <Box sx={{ minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography
          variant="h4"
          fontWeight={800}
          sx={{ wordBreak: 'break-word', opacity: done ? 1 : 0.6 }}
        >
          {shown}
        </Typography>
      </Box>
    </Card>
  );
};
