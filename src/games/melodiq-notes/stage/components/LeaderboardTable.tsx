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
import { playerKey, type LeaderboardRow } from '../logic/songResults';
import { useSongResults } from '../useSongResults';

interface LeaderboardRowsProps {
  rows: LeaderboardRow[];
  /** `playerKey`s of the rows to highlight. */
  highlight: ReadonlySet<string>;
  /** Chip text on a highlighted row. */
  badge: string;
}

/** The table of a song's best results; the stage and the pults show it (#699). */
export function LeaderboardRows({ rows, highlight, badge }: LeaderboardRowsProps) {
  const { t, i18n } = useTranslation();
  const k = (key: string) => t(`games.melodiq_notes.stage.leaderboard.${key}`);
  return (
    <Table size="small" sx={{ width: 'auto' }}>
      <TableHead>
        <TableRow>
          <TableCell align="right">{k('rank')}</TableCell>
          <TableCell>{k('player')}</TableCell>
          <TableCell align="right">{t('games.melodiq_notes.stage.results.score')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={playerKey(r)} selected={highlight.has(playerKey(r))}>
            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {r.rank}
            </TableCell>
            <TableCell>
              {r.player ?? t('games.melodiq_notes.stage.player', { no: r.seat })}
              <Typography component="span" variant="body2" color="text.secondary">
                {` · ${t(`games.melodiq_notes.stage.instruments.${r.inst}`)}`}
              </Typography>
              {highlight.has(playerKey(r)) && (
                <Chip size="small" color="success" label={badge} sx={{ ml: 1 }} />
              )}
            </TableCell>
            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {r.score.toLocaleString(i18n.language)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Best result per player for the song on stage, kept between visits (#699). */
export function LeaderboardTable({ engine }: { engine: StageEngine }) {
  const { t } = useTranslation();
  const k = (key: string) => t(`games.melodiq_notes.stage.leaderboard.${key}`);
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
      {board.length > 0 && <LeaderboardRows rows={board} highlight={fresh} badge={k('new_best')} />}
    </Stack>
  );
}
