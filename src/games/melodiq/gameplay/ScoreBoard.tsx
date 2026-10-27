import React, { useMemo } from 'react';
import { Box, Button, Grid, Typography } from '@mui/material';
import { useQueue } from '../hooks/useQueue';
import { useMelodiqSettings } from '../hooks/SettingsContext';
import { ScoreBoardQrCode } from './ScoreBoardQrCode';
import {
  buildHistoricalRanking,
  rankSession,
  type ScoreBoardPlayer,
} from './logic/scoreBoardRanking';
import { useScoreBoardAutoplay } from './scoreboard/useScoreBoardAutoplay';
import { ScoreBoardSessionRow } from './scoreboard/ScoreBoardSessionRow';
import { ScoreBoardHistory } from './scoreboard/ScoreBoardHistory';
import { ScoreBoardFooter } from './scoreboard/ScoreBoardFooter';
import { ScoreBoardEmpty } from './scoreboard/ScoreBoardEmpty';

interface ScoreBoardProps {
  players: ScoreBoardPlayer[];
  onExit: (forceHome?: boolean) => void;
  onResume?: () => void;
  isPassive?: boolean;
  onMinimize?: () => void;
}

/** Full-screen results overlay (TV-readable: large type, solid surfaces, no gradients). */
export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  players,
  onExit,
  onResume,
  isPassive,
  onMinimize,
}) => {
  const { queue } = useQueue();
  const { settings } = useMelodiqSettings();
  const { countdown, cancel } = useScoreBoardAutoplay({
    playerCount: players.length,
    noPlayersDelay: settings.autoplayNoPlayersDelay,
    withPlayersDelay: settings.autoplayWithPlayersDelay,
    isPassive,
    onExit,
  });

  const sessionRanking = useMemo(() => rankSession(players), [players]);
  const historicalRanking = useMemo(() => buildHistoricalRanking(players), [players]);
  const next = queue[0]?.song;

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 2000,
        overflow: 'hidden',
        p: { xs: 2, md: 4 },
      }}
    >
      {isPassive && onMinimize && (
        <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
          <Button variant="outlined" color="inherit" onClick={onMinimize}>
            ▼ Minimize
          </Button>
        </Box>
      )}
      {players.length > 0 && (
        <Typography
          variant="h3"
          sx={{
            textAlign: 'center',
            mb: 3,
            color: 'primary.text',
            fontSize: { xs: '2rem', md: '3.5rem' },
          }}
        >
          SESSION RESULTS
        </Typography>
      )}

      {players.length === 0 ? (
        <ScoreBoardEmpty next={next} />
      ) : (
        <Grid container spacing={4} sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <Grid
            size={{ xs: 12, md: 7 }}
            sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                overflowY: 'auto',
                pr: 1,
                pb: 2,
              }}
            >
              {sessionRanking.map((player, index) => (
                <ScoreBoardSessionRow key={player.config.id} player={player} rank={index + 1} />
              ))}
            </Box>
          </Grid>

          <Grid
            size={{ xs: 12, md: 5 }}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
              gap: 2,
            }}
          >
            <ScoreBoardHistory entries={historicalRanking} />
            <ScoreBoardQrCode />
          </Grid>
        </Grid>
      )}

      <ScoreBoardFooter
        isPassive={isPassive}
        queueLength={queue.length}
        nextTitle={next?.title}
        countdown={countdown}
        onExit={onExit}
        onResume={onResume}
        onCancelAutoPlay={cancel}
      />
    </Box>
  );
};
