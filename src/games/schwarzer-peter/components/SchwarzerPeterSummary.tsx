/**
 * Round result: who holds the Schwarzer Peter and the loss counts [ID: UI-SP-SUMMARY]
 */
import React from 'react';
import {
  Alert,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PlayingCard } from '../../../modules/playing-cards';
import type { SPState } from '../logic/types';

interface SchwarzerPeterSummaryProps {
  game: SPState;
  onNextRound: () => void;
  onRestart: () => void;
}

const K = 'games.schwarzer-peter';

export const SchwarzerPeterSummary: React.FC<SchwarzerPeterSummaryProps> = ({
  game,
  onNextRound,
  onRestart,
}) => {
  const { t } = useTranslation();
  const loser = game.players.find((p) => p.id === game.loserId);

  return (
    <Stack spacing={2}>
      <Typography variant="h6" fontWeight={700} textAlign="center">
        {t(`${K}.summary.round_title`, { n: game.round })}
      </Typography>

      {loser && (
        <Stack spacing={1} alignItems="center">
          <Alert severity="warning">{t(`${K}.summary.loser`, { name: loser.name })}</Alert>
          {loser.hand.map((card) => (
            <PlayingCard key={card.id} card={card} faceUp />
          ))}
        </Stack>
      )}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t(`${K}.summary.player`)}</TableCell>
            <TableCell align="right">{t(`${K}.summary.losses`)}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {game.players.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.name}</TableCell>
              <TableCell align="right">{p.losses}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Stack direction="row" spacing={1} justifyContent="center">
        <Button variant="contained" onClick={onNextRound}>
          {t(`${K}.summary.next_round`)}
        </Button>
        <Button variant="outlined" onClick={onRestart}>
          {t(`${K}.summary.new_game`)}
        </Button>
      </Stack>
    </Stack>
  );
};
