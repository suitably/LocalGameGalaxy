/**
 * Round result: every hand revealed, round scores and totals; game result when the game ended
 * [ID: UI-CABO-SUMMARY]
 */
import React from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { CaboState } from '../logic/types';
import { PlayingCard } from '../../../modules/playing-cards';

interface CaboSummaryProps {
  game: CaboState;
  onNextRound: () => void;
  onRestart: () => void;
}

export const CaboRoundSummary: React.FC<CaboSummaryProps> = ({ game, onNextRound, onRestart }) => {
  const { t } = useTranslation();
  const result = game.lastRound;
  const over = game.phase === 'game_over';
  const winners = game.players.filter((p) => game.winnerIds.includes(p.id));

  return (
    <Stack spacing={2}>
      <Typography variant="h6" fontWeight={700} textAlign="center">
        {over
          ? t('games.cabo.summary.game_over')
          : t('games.cabo.summary.round_title', { n: game.roundNumber })}
      </Typography>

      {over && (
        <Alert severity="success">
          {t('games.cabo.summary.winner', { names: winners.map((p) => p.name).join(', ') })}
        </Alert>
      )}

      {result?.callerId && (
        <Alert severity={result.callerPenalty ? 'warning' : 'info'}>
          {result.callerPenalty
            ? t('games.cabo.summary.caller_penalty')
            : t('games.cabo.summary.caller_ok')}
        </Alert>
      )}

      {result && result.resetIds.length > 0 && (
        <Alert severity="info">
          {t('games.cabo.summary.reset_to_half', {
            names: game.players
              .filter((p) => result.resetIds.includes(p.id))
              .map((p) => p.name)
              .join(', '),
          })}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('games.cabo.summary.player')}</TableCell>
              <TableCell>{t('games.cabo.summary.hand')}</TableCell>
              <TableCell align="right">{t('games.cabo.summary.round')}</TableCell>
              <TableCell align="right">{t('games.cabo.summary.total')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {game.players.map((p, i) => (
              <TableRow key={p.id}>
                <TableCell>{p.name}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {p.hand.map((card) => (
                      <PlayingCard key={card.id} card={card} faceUp size="sm" />
                    ))}
                  </Box>
                </TableCell>
                <TableCell align="right">{result?.roundScores[i] ?? '–'}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {p.totalScore}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Stack direction="row" spacing={1} justifyContent="center">
        {over ? (
          <Button variant="contained" onClick={onRestart}>
            {t('games.cabo.actions.restart')}
          </Button>
        ) : (
          <Button variant="contained" onClick={onNextRound}>
            {t('games.cabo.actions.next_round')}
          </Button>
        )}
      </Stack>
    </Stack>
  );
};
