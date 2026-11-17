/**
 * Scores of the finished hole and the running totals [ID: UI-GOLF-SUMMARY]
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
import type { GolfState } from '../logic/types';
import { GolfHand } from './GolfHand';

interface GolfSummaryProps {
  game: GolfState;
  onNextRound: () => void;
  onRestart: () => void;
}

export const GolfRoundSummary: React.FC<GolfSummaryProps> = ({ game, onNextRound, onRestart }) => {
  const { t } = useTranslation();
  const result = game.history[game.history.length - 1];
  const over = game.phase === 'game_over';
  const winners = game.players.filter((p) => game.winnerIds.includes(p.id));

  return (
    <Stack spacing={2}>
      <Typography variant="h6" fontWeight={700} textAlign="center">
        {over
          ? t('games.golf.summary.game_over')
          : t('games.golf.summary.hole_title', { n: game.roundNumber })}
      </Typography>

      {over && (
        <Alert severity="success">
          {t('games.golf.summary.winner', { names: winners.map((p) => p.name).join(', ') })}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('games.golf.summary.player')}</TableCell>
              <TableCell>{t('games.golf.summary.cards')}</TableCell>
              <TableCell align="right">{t('games.golf.summary.hole')}</TableCell>
              <TableCell align="right">{t('games.golf.summary.total')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {game.players.map((p, i) => (
              <TableRow key={p.id}>
                <TableCell>{p.name}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'inline-block' }}>
                    <GolfHand player={p} size="sm" />
                  </Box>
                </TableCell>
                <TableCell align="right">{result?.scores[i] ?? '–'}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {p.totalScore}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Stack direction="row" justifyContent="center">
        <Button variant="contained" onClick={over ? onRestart : onNextRound}>
          {over ? t('games.golf.actions.restart') : t('games.golf.actions.next_round')}
        </Button>
      </Stack>
    </Stack>
  );
};
