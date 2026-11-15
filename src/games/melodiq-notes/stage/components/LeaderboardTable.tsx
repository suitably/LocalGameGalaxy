import {
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { StageEngine } from '../engine/StageEngine';
import { playerKey } from '../logic/songResults';
import { useSongResults } from '../useSongResults';

/** Best result per player for the song on stage, kept between visits (#699). */
export function LeaderboardTable({ engine }: { engine: StageEngine }) {
  const { t, i18n } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.leaderboard.${key}`, opts);
  const { counted, board, fresh } = useSongResults(engine);

  return (
    <Stack spacing={0.5} alignItems="center">
      <Typography variant="subtitle1" fontWeight={700}>
        {k('title')}
      </Typography>
      {!counted && (
        <Typography variant="body2" color="text.secondary">
          {k('not_counted')}
        </Typography>
      )}
      {board.length > 0 && (
        <Table size="small" sx={{ width: 'auto' }}>
          <TableHead>
            <TableRow>
              <TableCell align="right">{k('rank')}</TableCell>
              <TableCell>{k('player')}</TableCell>
              <TableCell align="right">{t('games.melodiq_notes.stage.results.score')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {board.map((r) => (
              <TableRow key={playerKey(r)} selected={fresh.has(playerKey(r))}>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {r.rank}
                </TableCell>
                <TableCell>
                  {r.player ?? t('games.melodiq_notes.stage.player', { no: r.seat })}
                  <Typography component="span" variant="body2" color="text.secondary">
                    {` · ${t(`games.melodiq_notes.stage.instruments.${r.inst}`)}`}
                  </Typography>
                  {fresh.has(playerKey(r)) && (
                    <Chip size="small" color="success" label={k('new_best')} sx={{ ml: 1 }} />
                  )}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {r.score.toLocaleString(i18n.language)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
